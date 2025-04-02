export default function setCanvasResizeObserver(canvas: HTMLCanvasElement, device: GPUDevice, render: () => void) {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width =
        entry.devicePixelContentBoxSize?.[0].inlineSize || entry.contentBoxSize[0].inlineSize * devicePixelRatio;
      const height =
        entry.devicePixelContentBoxSize?.[0].blockSize || entry.contentBoxSize[0].blockSize * devicePixelRatio;

      const canvas = entry.target as HTMLCanvasElement;

      canvas.width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
      canvas.height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));

      render();
    }
  });
  try {
    observer.observe(canvas, { box: "device-pixel-content-box" });
  } catch {
    observer.observe(canvas, { box: "content-box" });
  }
}
