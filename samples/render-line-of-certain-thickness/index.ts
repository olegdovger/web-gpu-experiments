import generatePoints from "./src/generatePoints.ts";
import { invariant } from "~/utils/invariant.ts";
import { getCanvasElement } from "~/utils/getCanvasElement.ts";
import setupDevice from "~/utils/setupDevice.ts";
import computePointsShaderCode from "./compute.line.points.wgsl?raw";
import linesShaderCode from "./lines.wgsl?raw";
import setCanvasResizeObserver from "~/utils/setCanvasResizeObserver.ts";
import { clearValue } from "../../src/constants.ts";

// constants
const LINE_TOLERANCE = 10 / window.devicePixelRatio; // px
const NUMBER_OF_POINTS = 42; // 4_000_000 - max. Be careful with amount. Storage buffer binding size might be exceeded.
const OFFSET = 15 / window.devicePixelRatio; // px
const COLOR_OPACITY = 0.6;

invariant(navigator.gpu, "WebGPU has no support in browser");

const canvas = getCanvasElement("sample");

const { device, format, context } = await setupDevice(canvas);

context.configure({ device, format });

const thicknessBuffer = device.createBuffer({
  size: 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(thicknessBuffer, 0, new Float32Array([LINE_TOLERANCE])); // Толщина линии

setCanvasResizeObserver(canvas, device, async () => {
  const canvasTexture = context.getCurrentTexture();
  // Points generator constants
  const MIN_X = LINE_TOLERANCE + OFFSET;
  const MIN_Y = LINE_TOLERANCE + OFFSET;

  const MAX_X = canvas.width - LINE_TOLERANCE - OFFSET;
  const MAX_Y = canvas.height - LINE_TOLERANCE - OFFSET;

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
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(pointsBuffer, 0, pointsArray);

  const verticesBuffer = device.createBuffer({
    size: 4 * (pointsBuffer.size - 4 * 2),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const computePipeline = device.createComputePipeline({
    layout: "auto",
    compute: {
      module: device.createShaderModule({ code: computePointsShaderCode }),
      entryPoint: "main",
    },
  });

  const bindComputePointsGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: pointsBuffer } },
      { binding: 1, resource: { buffer: verticesBuffer } },
      { binding: 2, resource: { buffer: thicknessBuffer } },
    ],
  });

  const commandEncoder = device.createCommandEncoder();
  const computePass = commandEncoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, bindComputePointsGroup);
  computePass.dispatchWorkgroups(Math.ceil(pointsArray.length / 2 / 64));
  computePass.end();

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
    code: linesShaderCode,
  });

  const renderPipeline = device.createRenderPipeline({
    label: "Render pipeline",
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs",
    },
    fragment: {
      module,
      entryPoint: "fs",
      targets: [
        {
          format: "bgra8unorm",
          blend: {
            color: {
              operation: "add",
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
            },
            alpha: {
              operation: "add",
              srcFactor: "zero",
              dstFactor: "zero",
            },
          },
          // blend: {
          //   color: {
          //     srcFactor: 'src-alpha',
          //     dstFactor: 'one-minus-src-alpha',
          //     operation: 'add'
          //   },
          //   alpha: {
          //     srcFactor: 'one',
          //     dstFactor: 'one-minus-src-alpha',
          //     operation: 'add'
          //   }
          // }
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
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const bindRenderLinesGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: resolutionBuffer } },
      { binding: 1, resource: { buffer: verticesBuffer } }, // Используем pointsBuffer
    ],
  });

  device.queue.writeBuffer(resolutionBuffer, 0, new Float32Array([canvasTexture.width, canvasTexture.height]));

  renderPass.setBindGroup(0, bindRenderLinesGroup);
  renderPass.draw(pointsBuffer.size / 2 - 4);
  renderPass.end();

  const show_generated_values = false;

  const readbackBuffer = device.createBuffer({
    size: verticesBuffer.size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  if (show_generated_values) {
    commandEncoder.copyBufferToBuffer(verticesBuffer, 0, readbackBuffer, 0, verticesBuffer.size);
  }

  device.queue.submit([commandEncoder.finish()]);

  if (show_generated_values) {
    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const points = new Float32Array(readbackBuffer.getMappedRange());

    console.log(points);
    console.log(pointsArray);
  }
});
