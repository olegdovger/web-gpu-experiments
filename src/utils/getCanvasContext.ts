import { tryGet } from "~/utils/assert";

export function getCanvasContext(canvas: HTMLCanvasElement): GPUCanvasContext {
  return tryGet("Context is empty for some reason", canvas.getContext("webgpu"));
}
