import { getAdapter } from "./getAdapter.ts";
import { getCanvasContext } from "./getCanvasContext.ts";

interface DeviceSetup {
  device: GPUDevice;
  format: GPUTextureFormat;
  context: GPUCanvasContext;
}

export default async function setupDevice(canvas: HTMLCanvasElement): Promise<DeviceSetup> {
  const context = getCanvasContext(canvas);

  const adapter = await getAdapter();

  const device = await adapter.requestDevice();

  const format = navigator.gpu.getPreferredCanvasFormat();

  return { device, format, context };
}
