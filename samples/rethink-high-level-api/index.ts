import { invariant } from "~/utils/invariant.ts";
import makeBuffer from "./src/buffers/makeBuffer.ts";
import setupDevice from "~/utils/setupDevice.ts";
import makeRenderPipeline from "./src/makeRenderPipeline.ts";
import shaderCode from "./shader.wgsl?raw";
import { getCanvasElement } from "~/utils/getCanvasElement.ts";
import setCanvasResizeObserver from "~/utils/setCanvasResizeObserver.ts";

/*

- accessToGPUDevice()
- accessToCanvas()

- buildCommandEncoder()
- buildPassEncoder()

- buildShader()
- buildPipeline()

*/

const vertices = new Float32Array([
  0.0,
  0.0, // Point 1
  0.0,
  1.0, // Point 2
  1.0,
  0.0, // Point 3
  0.0,
  0.0, // Point 1
]);

invariant(navigator.gpu, "WebGPU has no support in browser");

const canvas = getCanvasElement("sample");

const { device, format, context } = await setupDevice(canvas);

context.configure({ device, format });

setCanvasResizeObserver(canvas, device);

const textureView = context.getCurrentTexture().createView();

const renderPassDescriptor: GPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: textureView,
      loadOp: "clear",
      clearValue: { r: 0.5, g: 0.5, b: 0.1, a: 1.0 },
      storeOp: "store",
    },
  ],
};

const frame = async () => {
  const colorAttachments = [...renderPassDescriptor.colorAttachments];

  invariant(colorAttachments, "No colorAttachments specified");

  const colorAttachment = colorAttachments[0];

  invariant(colorAttachment, "No colorAttachment specified");

  colorAttachment.view = context.getCurrentTexture().createView();

  const commandEncoder = device.createCommandEncoder();

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  const pipeline = makeRenderPipeline({ device, format, code: shaderCode });
  passEncoder.setPipeline(pipeline);

  const vertexBuffer = makeBuffer(device, vertices);
  passEncoder.setVertexBuffer(0, vertexBuffer);

  passEncoder.draw(Math.ceil(vertices.length / 2));
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(frame);
};

await frame();
