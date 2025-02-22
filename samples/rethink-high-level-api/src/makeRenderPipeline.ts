export default function makeRenderPipeline({
  device,
  format,
  code,
}: {
  device: GPUDevice;
  format: GPUTextureFormat;
  code: string;
}) {
  const shaderModule = device.createShaderModule({
    code,
  });

  return device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: shaderModule,
      entryPoint: "vertex_main",
      buffers: [
        {
          arrayStride: 8,
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fragment_main",
      targets: [
        {
          format: format,
        },
      ],
    },
    primitive: {
      topology: "line-strip",
    },
  });
}
