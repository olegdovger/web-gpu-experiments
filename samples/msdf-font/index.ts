import { mat4 } from "wgpu-matrix";

import MsdfTextRenderer from "../../src/fonts/msdf/MsdfTextRenderer";

import { ortho } from "~/utils/ortho";
import { getCanvasElement } from "~/utils/getCanvasElement";
import setupDevice from "~/utils/setupDevice";
import { setupCanvasSize } from "~/utils/setupCanvasSize";

const canvas = getCanvasElement("sample");

const { device, context, format } = await setupDevice(canvas);

setupCanvasSize(canvas);

context.configure({
  device,
  format: format,
  alphaMode: "premultiplied",
});

const textRenderer = new MsdfTextRenderer({
  device,
  canvas,
  context,
  clearColor: "#000000",
  debug: true,
});
await textRenderer.loadFont("/web-gpu-experiments/samples/msdf-font/font/basic-msdf/basic-msdf.json");

textRenderer.formatText(`100.55679`, {
  fontSize: 10,
  color: "#FFFFFF",
  offsetTop: 0,
  offsetLeft: 0,
});

textRenderer.formatText(
  `А хто там ідзе, а хто там ідзе\nУ агромністай такой грамадзе?\n– Беларусы.\n\nА што яны нясуць на худых плячах,\nНа руках ў крыві, на нагах у лапцях?\n– Сваю крыўду.\n\nА куды ж нясуць гэту крыўду ўсю,\nА куды ж нясуць на паказ сваю?\n– На свет цэлы.\n\nА хто гэта іх, не адзін мільён,\nКрыўду несць наўчыў, разбудзіў іх сон?\n– Бяда, гора.\n\nА чаго ж, чаго захацелась ім,\nПагарджаным век, ім, сляпым, глухім?\n– Людзьмі звацца.`,
  { fontSize: 14, color: "#FFFFFF", offsetTop: 100, offsetLeft: 100 },
);

textRenderer.render();

textRenderer.formatText(`One`, {
  fontSize: 16,
  color: "#FFFFFF",
  offsetTop: 500,
  offsetLeft: 600,
});

textRenderer.render();
