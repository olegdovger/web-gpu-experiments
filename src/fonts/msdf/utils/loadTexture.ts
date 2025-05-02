export async function loadTexture(url: string, device: GPUDevice) {
  const response = await fetch(url);
  const imageBitmap = await createImageBitmap(await response.blob());

  const texture = device.createTexture({
    label: `MSDF font texture ${url}`,
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture }, [
    imageBitmap.width,
    imageBitmap.height,
  ]);

  return texture;
}
