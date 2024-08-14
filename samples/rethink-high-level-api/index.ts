import { invariant, tryGet } from "../../src/utils/invariant.ts";

async function main() {
  invariant(navigator.gpu, "WebGPU has no support in browser");

  const { device, format, context } = await prepareDevice();

  const vertexBuffer = makeDataStore(device);
  const pipeline = prepareRendering(device, format);

  render(device, context, pipeline, vertexBuffer);
}

async function prepareDevice() {
  const canvas = tryGet("Canvas element is empty", document.getElementById("canvas") as HTMLCanvasElement);
  const adapter = tryGet("Adapter is not available", await navigator.gpu.requestAdapter());
  const context = tryGet("Context is empty for some reason", canvas.getContext("webgpu"));

  const device = await adapter.requestDevice();

  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({ device: device, format: format });

  return { device, format, context };
}

// Функция для создания буфера вершин
function makeDataStore(device?: GPUDevice) {
  const vertices = new Float32Array([
    -0.8,
    0.0, // Точка 1
    0.0,
    0.8, // Точка 2
    0.8,
    -0.4, // Точка 3
  ]);

  invariant(device, "No device");

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  return vertexBuffer;
}

// Функция для создания пайплайна
function prepareRendering(device: GPUDevice, format: GPUTextureFormat) {
  const shaderModule = device.createShaderModule({
    code: `
      @vertex
      fn vertex_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
          return vec4<f32>(position, 0.0, 1.0);
      }

      @fragment
      fn fragment_main() -> @location(0) vec4<f32> {
          return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Красный цвет
      }
    `,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: "line-strip",
    },
  });

  return pipeline;
}

// Функция для выполнения процесса рисования
function render(device: GPUDevice, context: GPUCanvasContext, pipeline: GPURenderPipeline, vertexBuffer: GPUBuffer) {
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        loadOp: "clear",
        clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 }, // Белый фон
        storeOp: "store",
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

main();
