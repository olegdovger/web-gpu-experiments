import generatePoints from "~/utils/generatePoints.ts";
import { invariant } from "~/utils/invariant.ts";
import { getCanvasElement } from "~/utils/getCanvasElement.ts";
import setupDevice from "~/utils/setupDevice.ts";
import dotsShaderCode from "./dots.wgsl?raw";
import setResizeObserver from "~/utils/setResizeObserver.ts";
import { clearValue } from "../../src/constants.ts";
import { getArrayStride } from "~/utils/getArrayStride.ts";

// constants
const POINT_SIZE = 4 / window.devicePixelRatio;
const NUMBER_OF_POINTS = 5_000; // 4_000_000 - max. Be careful with amount. Storage buffer binding size might be exceeded.
const OFFSET = 50 / window.devicePixelRatio;
const COLOR_OPACITY = 0.7;

invariant(navigator.gpu, "WebGPU has no support in browser");

const canvas = getCanvasElement("sample");

const { context, device, format } = await setupDevice(canvas);

context.configure({ device, format });

setResizeObserver(canvas, device, async () => {
  const canvasTexture = context.getCurrentTexture();
  // Points generator constants
  const MIN_X = POINT_SIZE + OFFSET;
  const MIN_Y = POINT_SIZE + OFFSET;

  const MAX_X = canvas.width - MIN_X;
  const MAX_Y = canvas.height - MIN_Y;

  console.log(MAX_X, MAX_Y);

  // Generate points
  const pointsArray = generatePoints({
    maxCount: NUMBER_OF_POINTS,

    minX: MIN_X,
    minY: MIN_Y,

    maxX: MAX_X,
    maxY: MAX_Y,
  });

  const pointsBuffer = device.createBuffer({
    size: pointsArray.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(pointsBuffer, 0, pointsArray);

  const commandEncoder = device.createCommandEncoder();

  const multisampleTexture = device.createTexture({
    format: canvasTexture.format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    size: [canvasTexture.width, canvasTexture.height],
    sampleCount: 4,
  });
  const depthTexture = device.createTexture({
    size: [canvasTexture.width, canvasTexture.height, 1],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    sampleCount: 4,
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        loadOp: "clear",
        storeOp: "store",
        clearValue: clearValue,
        view: multisampleTexture.createView(),
        resolveTarget: canvasTexture.createView(),
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthLoadOp: "clear",
      depthStoreOp: "store",
      depthClearValue: 1.0,
    },
  };

  const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
  const module = device.createShaderModule({
    label: "lines shader",
    code: dotsShaderCode,
  });

  const renderPipeline = device.createRenderPipeline({
    label: "Render pipeline",
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs",
      constants: {
        pointSize: POINT_SIZE,
      },
      buffers: [
        {
          arrayStride: getArrayStride("float32x2"),
          stepMode: "instance",
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
        },
      ],
    },
    fragment: {
      module,
      entryPoint: "fs",
      targets: [
        {
          format: "bgra8unorm",
          // blend: {
          //   color: {
          //     operation: "add",
          //     srcFactor: "src-alpha",
          //     dstFactor: "one-minus-src-alpha",
          //   },
          //   alpha: {
          //     operation: "add",
          //     srcFactor: "zero",
          //     dstFactor: "zero",
          //   },
          // },
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
      constants: {
        opacity: COLOR_OPACITY,
      },
    },
    multisample: {
      count: 4,
    },
    primitive: {
      topology: "triangle-strip",
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus",
    },
  });

  renderPass.setPipeline(renderPipeline);

  const resolutionBuffer = device.createBuffer({
    size: 4 * 2,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindRenderLinesGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: resolutionBuffer } }],
  });

  device.queue.writeBuffer(resolutionBuffer, 0, new Float32Array([canvasTexture.width, canvasTexture.height]));

  renderPass.setVertexBuffer(0, pointsBuffer);
  renderPass.setBindGroup(0, bindRenderLinesGroup);
  renderPass.draw(24, NUMBER_OF_POINTS);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
});
