import { invariant } from "../../src/utils/invariant.ts";
import loadShader from "./loadShader.ts";
import makeBuffer from "./src/buffers/makeBuffer.ts";
import makeDevice from "./src/makeDevice.ts";
import makeRenderPipeline from "./src/makeRenderPipeline.ts";

const shaderCode = await loadShader("./shader.wgsl");

/*

- accessToGPUDevice()
- accessToCanvas()

- buildCommandEncoder()
- buildPassEncoder()

- buildShader()
- buildPipeline()

*/

interface RenderOpts {
  device: GPUDevice;
  context: GPUCanvasContext;
  pipeline: GPURenderPipeline;
  vertexBuffer: GPUBuffer;
}

async function main() {
  invariant(navigator.gpu, "WebGPU has no support in browser");

  const { device, format, context } = await makeDevice();

  const vertices = new Float32Array([
    0.0,
    0.0, // Point 1
    0.0,
    1.0, // Point 2
    1.0,
    0.0, // Point 3
    0.0,
    0.0,
  ]);

  render({
    device,
    context,
    pipeline: makeRenderPipeline({ device, format, code: shaderCode }),
    vertexBuffer: makeBuffer(device, vertices),
  });
}

// Функция для выполнения процесса рисования
function render({ device, context, pipeline, vertexBuffer }: RenderOpts) {
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        loadOp: "clear",
        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
        storeOp: "store",
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(4);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

await main();
