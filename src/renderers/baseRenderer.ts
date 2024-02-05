import { clearValue } from "../constants";

export function renderPass(
  device: GPUDevice,
  context: GPUCanvasContext,
  execute: (passEncoder: GPURenderPassEncoder) => void
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

  execute(passEncoder);

  device.queue.submit([commandEncoder.finish()]);
}
