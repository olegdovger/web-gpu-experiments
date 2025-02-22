interface VertexBufferProps {
  vertices1DArray: number[];
  device: GPUDevice;
}

export default function makeVertexBuffer({ vertices1DArray, device }: VertexBufferProps): GPUBuffer {
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

  return buffer;
}
