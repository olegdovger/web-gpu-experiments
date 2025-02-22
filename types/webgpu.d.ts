export interface ExtendedGPURenderPassDescriptor extends GPURenderPassDescriptor {
  colorAttachments: Array<GPURenderPassColorAttachment | null>;
}
