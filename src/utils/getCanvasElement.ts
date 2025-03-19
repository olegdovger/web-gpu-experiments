import { tryGet } from "~/utils/invariant.ts";

export function getCanvasElement(elementId: string): HTMLCanvasElement {
  return tryGet("Canvas element is empty", document.getElementById(elementId) as HTMLCanvasElement);
}
