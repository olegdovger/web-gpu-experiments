import { assert } from "~/utils/assert";
import { getCanvasElement } from "~/utils/getCanvasElement.ts";
// import setupDevice from "~/utils/setupDevice.ts";

assert(navigator.gpu, "WebGPU has no support in browser");

const canvas = getCanvasElement("sample");

// const { context, device, format } = await setupDevice(canvas);

// context.configure({ device, format });

const image = new Image();
const ctx = canvas.getContext("2d");

assert(ctx, "ctx is empty");
// Wait for the sprite sheet to load

image.onload = async () => {
  const sprite = await createImageBitmap(image, 0, 0, 32, 32, {
    resizeWidth: 32,
    resizeHeight: 32,
  });

  ctx.drawImage(sprite, 32, 32);
};

image.src = "line-3-svgrepo-com.svg";
image.width = 32;
image.height = 32;
