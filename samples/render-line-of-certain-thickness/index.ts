import generatePoints from "~/utils/generatePoints.ts";
import { assert } from "~/utils/assert";
import { getCanvasElement } from "~/utils/getCanvasElement.ts";
import setupDevice from "~/utils/setupDevice.ts";
import computePointsShaderCode from "./compute.line.points.wgsl?raw";
import linesShaderCode from "./lines.wgsl?raw";
import setResizeObserver from "~/utils/setResizeObserver";
import { clearValue } from "~/constants.ts";

// constants
const LINE_TOLERANCE = 10 / window.devicePixelRatio; // px
const NUMBER_OF_POINTS = 42; // 4_000_000 - max. Be careful with amount. Storage buffer binding size might be exceeded.
const OFFSET = 50 / window.devicePixelRatio; // px
const lineColor = [0.5, 0.8, 0.5, 0.5];

assert(navigator.gpu, "WebGPU has no support in browser");

const canvas = getCanvasElement("sample");

const { device, format, context } = await setupDevice(canvas);

context.configure({ device, format });

setResizeObserver(canvas, device, async () => {
  const canvasTexture = context.getCurrentTexture();
  // Points generator constants
  const MIN_X = LINE_TOLERANCE + OFFSET;
  const MIN_Y = LINE_TOLERANCE + OFFSET;

  const MAX_X = canvas.width - MIN_X;
  const MAX_Y = canvas.height - MIN_Y;

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
      constants: {
        thickness: LINE_TOLERANCE,
      },
    },
  });

  const bindComputePointsGroup = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: pointsBuffer } },
      { binding: 1, resource: { buffer: verticesBuffer } },
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
        },
      ],
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

  const colorBuffer = device.createBuffer({
    size: 4 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(colorBuffer, 0, new Float32Array(lineColor));

  const bindRenderLinesGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: resolutionBuffer } },
      { binding: 1, resource: { buffer: verticesBuffer } },
      { binding: 2, resource: { buffer: colorBuffer } },
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
