import { invariant } from "~/utils/invariant.ts";

export default function setCanvasSize(canvas: HTMLCanvasElement) {
  const parentElement = canvas.parentElement;

  invariant(parentElement, "Parent tag not found");

  const bounds = parentElement.getBoundingClientRect();

  canvas.width = bounds.width;
  canvas.height = bounds.height;

  console.log(canvas.width, canvas.height);
}
