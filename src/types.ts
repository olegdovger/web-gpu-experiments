export interface GPUContext {
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;
  swapChainFormat: GPUTextureFormat;
}
