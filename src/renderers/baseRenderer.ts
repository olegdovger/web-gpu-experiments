import { clearValue } from "../constants";

export async function renderPass(
  device: GPUDevice,
  context: GPUCanvasContext,
  execute: (
    passEncoder: GPURenderPassEncoder,
    commandEncoder: GPUCommandEncoder,
  ) => Promise<void>,
) {
  const view = context.getCurrentTexture().createView();

  const colorAttachment: GPURenderPassColorAttachment = {
    view: view,
    clearValue: clearValue,
    loadOp: "clear",
    storeOp: "store",
  };

  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [colorAttachment],
  };

  const commandEncoder: GPUCommandEncoder = device.createCommandEncoder({
    label: "Base Renderer: command encoder",
  });
  const passEncoder: GPURenderPassEncoder =
    commandEncoder.beginRenderPass(renderPassDescriptor);

  await execute(passEncoder, commandEncoder);

  device.queue.submit([commandEncoder.finish()]);
}
