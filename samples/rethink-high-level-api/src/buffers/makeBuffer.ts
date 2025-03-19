import { invariant } from "~/utils/invariant";

export default function makeBuffer(device: GPUDevice, bufferSource: BufferSource | SharedArrayBuffer) {
  invariant(device, "No device");

  const vertexBuffer = device.createBuffer({
    size: bufferSource.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, bufferSource);

  return vertexBuffer;
}
