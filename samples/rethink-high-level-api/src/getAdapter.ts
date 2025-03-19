import { tryGet } from "~/utils/invariant.ts";

export async function getAdapter(): Promise<GPUAdapter> {
  return tryGet("Adapter is not available", await navigator.gpu.requestAdapter());
}
