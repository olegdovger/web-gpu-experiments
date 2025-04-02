import computePointsShaderCode from "../shaders/compute.line.points.wgsl?raw";
import linesShaderCode from "../shaders/lines.wgsl?raw";

export class PolylineRenderer {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private sampleCount: number;

  constructor(device: GPUDevice, format: GPUTextureFormat, sampleCount: number) {
    this.device = device;
    this.format = format;
    this.sampleCount = sampleCount;
  }

  public render(
    renderPass: GPURenderPassEncoder,
    canvasTexture: GPUTexture,
    polylines: Array<{
      data: Float32Array;
      color: Float32Array;
      thickness?: number;
      visible: boolean;
    }>,
  ): void {
    if (polylines.length === 0) return;

    for (const polyline of polylines) {
      if (!polyline.visible) continue;

      const points = polyline.data;
      const color = polyline.color;
      const thickness = polyline.thickness ?? 1;

      const pointsBuffer = this.device.createBuffer({
        size: points.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      this.device.queue.writeBuffer(pointsBuffer, 0, points);

      const verticesBuffer = this.device.createBuffer({
        size: 4 * (pointsBuffer.size - 4 * 2),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });

      const computePipeline = this.device.createComputePipeline({
        layout: "auto",
        compute: {
          module: this.device.createShaderModule({ code: computePointsShaderCode }),
          entryPoint: "main",
          constants: {
            thickness: thickness,
          },
        },
      });

      const bindComputePointsGroup = this.device.createBindGroup({
        layout: computePipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: pointsBuffer } },
          { binding: 1, resource: { buffer: verticesBuffer } },
        ],
      });

      const computeCommandEncoder = this.device.createCommandEncoder({
        label: "Command compute encoder",
      });

      const computePass = computeCommandEncoder.beginComputePass();
      computePass.setPipeline(computePipeline);
      computePass.setBindGroup(0, bindComputePointsGroup);
      computePass.dispatchWorkgroups(Math.ceil(points.length / 2 / 64));
      computePass.end();

      this.device.queue.submit([computeCommandEncoder.finish()]);

      const resolutionBuffer = this.device.createBuffer({
        size: 8,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.device.queue.writeBuffer(resolutionBuffer, 0, new Float32Array([canvasTexture.width, canvasTexture.height]));

      const colorBuffer = this.device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.device.queue.writeBuffer(colorBuffer, 0, color);

      const module = this.device.createShaderModule({
        label: "lines shader",
        code: linesShaderCode,
      });

      const renderPipeline = this.device.createRenderPipeline({
        label: "Render pipeline",
        layout: "auto",
        vertex: {
          module,
          entryPoint: "vs",
        },
        fragment: {
          module,
          entryPoint: "fs",
          targets: [
            {
              format: this.format,
              blend: {
                color: {
                  operation: "add",
                  srcFactor: "src-alpha",
                  dstFactor: "one-minus-src-alpha",
                },
                alpha: {
                  operation: "add",
                  srcFactor: "one",
                  dstFactor: "one",
                },
              },
            },
          ],
        },
        multisample: {
          count: this.sampleCount,
        },
        primitive: {
          topology: thickness > 1 ? "triangle-strip" : "line-strip",
        },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: "always",
          format: "depth24plus",
        },
      });

      renderPass.setPipeline(renderPipeline);

      const bindRenderLinesGroup = this.device.createBindGroup({
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: resolutionBuffer } },
          { binding: 1, resource: { buffer: verticesBuffer } },
          { binding: 2, resource: { buffer: colorBuffer } },
        ],
      });

      renderPass.setBindGroup(0, bindRenderLinesGroup);
      renderPass.draw(pointsBuffer.size / 2 - 4);
    }
  }
}
