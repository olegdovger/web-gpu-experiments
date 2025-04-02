import gridShaderCode from "../shaders/grid.wgsl?raw";

export interface GridOptions {
  cellSize?: number;
  color?: Float32Array;
  lineWidth?: number;
  visible?: boolean;
}

export class GridRenderer {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private sampleCount: number;

  constructor(device: GPUDevice, format: GPUTextureFormat, sampleCount: number) {
    this.device = device;
    this.format = format;
    this.sampleCount = sampleCount;
  }

  public render(renderPass: GPURenderPassEncoder, canvasTexture: GPUTexture, options: GridOptions = {}): void {
    const { cellSize = 50, color = new Float32Array([0.5, 0.5, 0.5, 0.5]), lineWidth = 1.0, visible = true } = options;

    if (!visible) return;

    // Create a full-screen quad vertex buffer
    const vertices = new Float32Array([
      -1.0,
      -1.0, // Bottom-left
      1.0,
      -1.0, // Bottom-right
      -1.0,
      1.0, // Top-left
      1.0,
      1.0, // Top-right
    ]);

    const vertexBuffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, vertices);

    // Create uniform buffer for resolution, cell size, and color
    const uniformBuffer = this.device.createBuffer({
      size: 32, // 2 floats for resolution (8) + 1 float for cell size (4) + 1 float for line width (4) + 4 floats for color (16)
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Resolution, cell size, and line width
    const uniformData = new Float32Array([canvasTexture.width, canvasTexture.height, cellSize, lineWidth]);
    this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Color
    this.device.queue.writeBuffer(uniformBuffer, 16, color);

    // Create shader module
    const shaderModule = this.device.createShaderModule({
      label: "Grid shader",
      code: gridShaderCode,
    });

    // Create render pipeline
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: 8, // 2 floats × 4 bytes
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
        entryPoint: "fs",
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-strip",
      },
      multisample: {
        count: this.sampleCount,
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "always",
        format: "depth24plus",
      },
    });

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });

    // Set pipeline and draw
    renderPass.setPipeline(pipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(4); // 4 vertices for a quad
  }
}
