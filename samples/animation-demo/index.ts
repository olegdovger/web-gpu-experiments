import { getCanvasElement } from "~/utils/getCanvasElement";
import { assert } from "~/utils/assert";
import setupDevice from "~/utils/setupDevice";
import squareShaderCode from "./square.shader.wgsl?raw";
import circleShaderCode from "./circle.shader.wgsl?raw";
import setOptimalResizeObserver from "~/utils/setOptimalResizeObserver";
import { setupCanvas } from "~/utils/setupCanvas";
import { clearValue } from "~/constants";

assert(navigator.gpu, "WebGPU is not supported");

const canvas = getCanvasElement("sample");
setupCanvas(canvas);

const { device, context, format } = await setupDevice(canvas);

context.configure({
  device,
  format,
  alphaMode: "premultiplied",
});

const buffers = {
  resolution: device.createBuffer({
    size: 8, // 2 x f32 for width and height
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  }),
  squareCenter: device.createBuffer({
    size: 8, // 2 x f32 for x and y
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  }),
  squareSize: device.createBuffer({
    size: 8, // 2 x f32 for width and height
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  }),
  circleCenter: device.createBuffer({
    size: 8, // 2 x f32 for x and y
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  }),
  circleSize: device.createBuffer({
    size: 8, // 2 x f32 for width and height
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  }),
  circleSmoothness: device.createBuffer({
    size: 4, // 1 x f32 for smoothness
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  }),
};

const squarePipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: {
    module: device.createShaderModule({ code: squareShaderCode }),
    entryPoint: "vertexMain",
  },
  fragment: {
    module: device.createShaderModule({ code: squareShaderCode }),
    entryPoint: "fragmentMain",
    targets: [
      {
        format,
        blend: {
          color: {
            operation: "add",
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
          },
          alpha: {
            operation: "add",
            srcFactor: "one",
            dstFactor: "one",
          },
        },
      },
    ],
  },
  primitive: {
    topology: "triangle-list",
  },
  multisample: {
    count: 4,
  },
  depthStencil: {
    depthWriteEnabled: false,
    depthCompare: "always",
    format: "depth24plus",
  },
});

const circlePipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: {
    module: device.createShaderModule({ code: circleShaderCode }),
    entryPoint: "vertexMain",
  },
  fragment: {
    module: device.createShaderModule({ code: circleShaderCode }),
    entryPoint: "fragmentMain",
    targets: [
      {
        format: format,
        blend: {
          color: {
            operation: "add",
            srcFactor: "src-alpha",
            dstFactor: "one-minus-src-alpha",
          },
          alpha: {
            operation: "add",
            srcFactor: "one",
            dstFactor: "one",
          },
        },
      },
    ],
  },
  primitive: {
    topology: "triangle-list",
  },
  multisample: {
    count: 4,
  },
  depthStencil: {
    depthWriteEnabled: false,
    depthCompare: "always",
    format: "depth24plus",
  },
});

// Pre-allocate Float32Arrays to avoid creating new ones every frame
const resolutionData = new Float32Array(2);
const squareCenterData = new Float32Array(2);
const squareSizeData = new Float32Array(2);
const circleCenterData = new Float32Array(2);
const circleSizeData = new Float32Array(2);
const circleSmoothnessData = new Float32Array(1);

// Cache for reusing textures
let multisampledTexture: GPUTexture | null = null;
let depthTexture: GPUTexture | null = null;
let currentWidth = 0;
let currentHeight = 0;

let currentTime = 0;
let lastTime = performance.now();

function render() {
  const canvasTexture = context.getCurrentTexture();
  const canvasWidth = canvasTexture.width;
  const canvasHeight = canvasTexture.height;

  // Update resolution uniform
  resolutionData[0] = canvasWidth;
  resolutionData[1] = canvasHeight;
  device.queue.writeBuffer(buffers.resolution, 0, resolutionData);

  // Update circle smoothness
  circleSmoothnessData[0] = 1;
  device.queue.writeBuffer(buffers.circleSmoothness, 0, circleSmoothnessData);

  const now = performance.now();
  const deltaTime = now - lastTime;
  lastTime = now;
  currentTime += deltaTime;

  const t = Math.abs(Math.sin(currentTime / 2000));
  const k = t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (t - 1) * (t - 1) * (t - 1) * (t - 1);

  const startX = squareSizeData[0] / 2;
  const startY = squareSizeData[1] / 2;
  const endX = k * canvasWidth - squareSizeData[0] / 2;
  const endY = k * canvasHeight - squareSizeData[1] / 2;

  // Update square center
  squareCenterData[0] = startX + (endX - startX) * k;
  squareCenterData[1] = startY + (endY - startY) * k;
  device.queue.writeBuffer(buffers.squareCenter, 0, squareCenterData);

  // Update circle center
  circleCenterData[0] = canvasWidth / 2;
  circleCenterData[1] = canvasHeight / 2;
  device.queue.writeBuffer(buffers.circleCenter, 0, circleCenterData);

  // Update circle size
  circleSizeData[0] = 100 * k + 20;
  circleSizeData[1] = 100 * k + 20;
  device.queue.writeBuffer(buffers.circleSize, 0, circleSizeData);

  // Update square size
  squareSizeData[0] = (k * canvasWidth) / 10 + 20;
  squareSizeData[1] = (k * canvasWidth) / 10 + 20;
  device.queue.writeBuffer(buffers.squareSize, 0, squareSizeData);

  const commandEncoder = device.createCommandEncoder();

  // Reuse textures if canvas size hasn't changed
  if (currentWidth !== canvasWidth || currentHeight !== canvasHeight) {
    // Clean up previous textures to free memory
    if (multisampledTexture) multisampledTexture.destroy();
    if (depthTexture) depthTexture.destroy();

    // Create new textures
    multisampledTexture = device.createTexture({
      size: [canvasWidth, canvasHeight],
      format: format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: 4,
    });

    depthTexture = device.createTexture({
      size: [canvasWidth, canvasHeight],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: 4,
    });

    currentWidth = canvasWidth;
    currentHeight = canvasHeight;
  }

  if (!multisampledTexture || !depthTexture) {
    return;
  }

  const multisampledTextureView = multisampledTexture.createView();
  const depthTextureView = depthTexture.createView();

  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        loadOp: "clear",
        storeOp: "store",
        clearValue: clearValue,
        view: multisampledTextureView,
        resolveTarget: canvasTexture.createView(),
      },
    ],
    depthStencilAttachment: {
      view: depthTextureView,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  });

  // Draw square
  renderPass.setPipeline(squarePipeline);
  renderPass.setBindGroup(
    0,
    device.createBindGroup({
      layout: squarePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: buffers.resolution },
        },
        {
          binding: 1,
          resource: { buffer: buffers.squareCenter },
        },
        {
          binding: 2,
          resource: { buffer: buffers.squareSize },
        },
      ],
    }),
  );
  renderPass.draw(6);

  // Draw circle
  renderPass.setPipeline(circlePipeline);
  renderPass.setBindGroup(
    0,
    device.createBindGroup({
      layout: circlePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: buffers.resolution },
        },
        {
          binding: 1,
          resource: { buffer: buffers.circleCenter },
        },
        {
          binding: 2,
          resource: { buffer: buffers.circleSize },
        },
        {
          binding: 3,
          resource: { buffer: buffers.circleSmoothness },
        },
      ],
    }),
  );
  renderPass.draw(6);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(render);
}

// Set up canvas resize observer
setOptimalResizeObserver(canvas, device, render);
