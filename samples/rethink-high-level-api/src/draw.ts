import { Plot } from "./initPlot";
import drawPolylines from "./drawPolylines";
import drawLines from "./drawLines";
import transformColor from "./transformColor";

let commandEncoder: GPUCommandEncoder;
let renderPass: GPURenderPassEncoder;

const clearValue = transformColor("#333");

function startDraw(device: GPUDevice, context: GPUCanvasContext) {
  commandEncoder = device.createCommandEncoder();

  const canvasTexture = context.getCurrentTexture();

  const multisampleTexture = device.createTexture({
    format: canvasTexture.format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    size: [canvasTexture.width, canvasTexture.height],
    sampleCount: 4,
  });
  const depthTexture = device.createTexture({
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    size: [canvasTexture.width, canvasTexture.height, 1],
    sampleCount: 4,
  });

  const renderPassDescriptor: GPURenderPassDescriptor = {
    label: "Render Pass",
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

  renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);
}

function endDraw(device: GPUDevice) {
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
}

export default function draw(props: Plot["internal"]) {
  startDraw(props.device, props.context);

  drawPolylines({ ...props, commandEncoder, renderPass });
  drawLines({ ...props, commandEncoder, renderPass });

  endDraw(props.device);
}
