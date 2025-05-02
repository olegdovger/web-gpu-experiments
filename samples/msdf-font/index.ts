import { mat4, vec3 } from "wgpu-matrix";

import MsdfTextRenderer from "../../src/fonts/msdf/MsdfTextRenderer";

import tgpu from "typegpu";
import { ExtendedGPURenderPassDescriptor } from "../../types/webgpu";
import { fetchFontArtefacts } from "~/fonts/msdf/utils/fetchFontArtefacts";

const root = await tgpu.init();
const device = root.device;

let projectionMatrix: Float32Array;

const canvas = document.querySelector("canvas") as unknown as HTMLCanvasElement;
const context = canvas.getContext("webgpu") as unknown as GPUCanvasContext;

const devicePixelRatio = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
const depthFormat = "depth24plus";

context.configure({
  device,
  format: presentationFormat,
});

const textRenderer = new MsdfTextRenderer(device, presentationFormat, depthFormat);
const fontArtefacts = await fetchFontArtefacts(
  "/web-gpu-experiments/samples/msdf-font/font/basic-msdf/basic-msdf.json",
  device,
);
const font = textRenderer.createFont(fontArtefacts);

const titleText = textRenderer.formatText(font, `«А хто там ідзе?»`, {
  centered: true,
  pixelScale: 1 / 128,
});

const largeText = textRenderer.formatText(
  font,
  `
А хто там ідзе, а хто там ідзе
У агромністай такой грамадзе?
– Беларусы.

А што яны нясуць на худых плячах,
На руках ў крыві, на нагах у лапцях?
– Сваю крыўду.

А куды ж нясуць гэту крыўду ўсю,
А куды ж нясуць на паказ сваю?
– На свет цэлы.

А хто гэта іх, не адзін мільён,
Крыўду несць наўчыў, разбудзіў іх сон?
– Бяда, гора.

А чаго ж, чаго захацелась ім,
Пагарджаным век, ім, сляпым, глухім?
– Людзьмі звацца.`,
  { pixelScale: 1 / 1024 },
);

const text = [titleText, largeText];

const depthTexture = device.createTexture({
  size: [canvas.width, canvas.height],
  format: depthFormat,
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const renderPassDescriptor: ExtendedGPURenderPassDescriptor = {
  colorAttachments: [
    {
      view: context.getCurrentTexture().createView(),
      clearValue: [0, 0, 0, 1],
      loadOp: "clear",
      storeOp: "store",
    },
  ],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    depthClearValue: 1.0,
    depthLoadOp: "clear",
    depthStoreOp: "store",
  },
};

const aspect = canvas.width / canvas.height;
projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);

// const start = Date.now();

function transformText() {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -1), viewMatrix);

  // Scale based on window dimensions to maintain consistent size
  const scale = Math.min(canvas.width, canvas.height) / 1000;
  mat4.scale(viewMatrix, vec3.fromValues(scale, scale, 1), viewMatrix);

  textRenderer.updateCamera(projectionMatrix, viewMatrix);
}
function drawFrame() {
  if (renderPassDescriptor.colorAttachments[0]) {
    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
  }

  const commandEncoder = device.createCommandEncoder();
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);

  transformText();

  textRenderer.render(passEncoder, ...text);

  passEncoder.end();
  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(drawFrame);
}

requestAnimationFrame(drawFrame);

// Add resize handler
window.addEventListener("resize", () => {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const aspect = canvas.width / canvas.height;
  projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);

  // Update depth texture size
  // depthTexture.destroy();
  const depthTexture = device.createTexture({
    size: [canvas.width, canvas.height],
    format: depthFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  renderPassDescriptor.depthStencilAttachment = {
    view: depthTexture.createView(),
    depthClearValue: 1.0,
    depthLoadOp: "clear",
    depthStoreOp: "store",
  };
});
