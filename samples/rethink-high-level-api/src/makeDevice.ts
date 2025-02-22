import { tryGet } from "../../../src/utils/invariant";

interface DeviceSetup {
  device: GPUDevice;
  format: GPUTextureFormat;
  context: GPUCanvasContext;
}

export default async function makeDevice(): Promise<DeviceSetup> {
  const canvas = tryGet("Canvas element is empty", document.getElementById("sample") as HTMLCanvasElement);
  const adapter = tryGet("Adapter is not available", await navigator.gpu.requestAdapter());
  const context = tryGet("Context is empty for some reason", canvas.getContext("webgpu"));

  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();

  console.info("Preferred canvas gpu texture format:", format);

  context.configure({ device, format });

  return { device, format, context };
}
