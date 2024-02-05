interface VertexBufferProps {
  vertices1DArray: number[];
  device: GPUDevice;
  shaderLocation: number;
}

export interface VertexBufferOutput {
  buffer: GPUBuffer;
  layout: GPUVertexBufferLayout;
}

export default function makeVertexBufferAndLayout({
  vertices1DArray,
  device,
  shaderLocation,
}: VertexBufferProps): VertexBufferOutput {
  const vertices = new Float32Array(vertices1DArray);

  const buffer = device.createBuffer({
    label: "makeVertexBuffer: vertex buffer",
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    // mappedAtCreation: true,
  });

  // new Float32Array(buffer.getMappedRange()).set(vertices);
  // buffer.unmap();
  device.queue.writeBuffer(buffer, 0, vertices);

  const layout: GPUVertexBufferLayout = {
    arrayStride: 8,
    attributes: [
      {
        shaderLocation: shaderLocation,
        offset: 0,
        format: "float32x2",
      },
    ],
    stepMode: "vertex",
  };

  return {
    buffer,
    layout,
  };
}
