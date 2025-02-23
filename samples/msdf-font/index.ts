import { mat4, vec3 } from "wgpu-matrix";

import { MsdfTextRenderer } from "../../src/fonts/msdf/text";

import tgpu from "typegpu";
import { ExtendedGPURenderPassDescriptor } from "../../types/webgpu";

import fontJSON from "./font/basic-msdf/basic-msdf.json";

const root = await tgpu.init();
const device = root.device;

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

const textRenderer = new MsdfTextRenderer(root, presentationFormat, depthFormat);
const font = await textRenderer.createFont("/web-gpu-experiments/samples/msdf-font/font/basic-msdf/basic-msdf.json");

const titleText = textRenderer.formatText(font, `«А хто там ідзе?»`, {
  centered: true,
  // fontSize: 16,
  pixelScale: 1 / 90,
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
  { fontSize: 12 },
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
      view: context.getCurrentTexture().createView(), // Assigned later
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
const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0);

// const start = Date.now();

function transformText() {
  const viewMatrix = mat4.identity();
  mat4.translate(viewMatrix, vec3.fromValues(0, 0, -2), viewMatrix);
  // Update the projection and view matrices for the text
  textRenderer.updateCamera(projectionMatrix, viewMatrix);

  // // Update the transform of all the text surrounding the cube
  // const textMatrix = mat4.create();
  // // Update the transform of the larger block of text
  // // const crawl = ((Date.now() - start) / 10_500) % 14;
  //
  // mat4.identity(textMatrix);
  // // mat4.rotateY(textMatrix, -Math.PI / 8, textMatrix);
  // mat4.translate(textMatrix, [0, 1, 0], textMatrix);
  //
  // titleText.setTransform(textMatrix);
  //
  // mat4.translate(textMatrix, [-1, -0.5, 0], textMatrix);
  //
  // largeText.setTransform(textMatrix);
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
