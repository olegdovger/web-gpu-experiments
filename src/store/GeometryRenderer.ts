import { GeometryStore, GeometryPrimitive, GeometryPrimitiveType } from "./GeometryStore";

/**
 * Configuration options for the GeometryRenderer
 */
export interface GeometryRendererConfig {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
  multisampled?: boolean;
  depthFormat?: GPUTextureFormat;
}

/**
 * GeometryRenderer class handles WebGPU rendering of geometric primitives
 * stored in the GeometryStore
 */
export class GeometryRenderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  private canvas: HTMLCanvasElement;
  private store: GeometryStore;

  // Rendering configuration
  private multisampled: boolean;
  private depthFormat: GPUTextureFormat;

  // WebGPU resources
  private depthTexture: GPUTexture | null = null;
  private multisampleTexture: GPUTexture | null = null;
  private renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined as unknown as GPUTextureView,
        resolveTarget: undefined,
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
    depthStencilAttachment: {
      view: undefined as unknown as GPUTextureView,
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    },
  };

  // Shader modules and pipelines cache
  private shaderModules: Map<string, GPUShaderModule> = new Map();
  private renderPipelines: Map<GeometryPrimitiveType, GPURenderPipeline> = new Map();

  // Buffer caches to avoid recreating buffers for unchanged data
  private gpuBufferCache: Map<string, GPUBuffer> = new Map();

  /**
   * Create a new GeometryRenderer instance
   */
  constructor(config: GeometryRendererConfig) {
    this.device = config.device;
    this.context = config.context;
    this.format = config.format;
    this.canvas = config.canvas;
    this.store = GeometryStore.getInstance();

    // Optional configuration with defaults
    this.multisampled = config.multisampled ?? true;
    this.depthFormat = config.depthFormat ?? "depth24plus";

    // Setup render resources
    this.setupRenderResources();

    // Register with store for auto-rendering
    this.store.setRenderCallback(() => this.render());

    // Handle canvas resize
    this.setupResizeHandler();
  }

  /**
   * Setup WebGPU render resources
   */
  private setupRenderResources(): void {
    // Create depth texture
    this.createDepthTexture();

    // Create multisample texture if enabled
    if (this.multisampled) {
      this.createMultisampleTexture();
    }

    // Update render pass descriptor
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];

    if (this.multisampled && this.multisampleTexture) {
      colorAttachments[0].view = this.multisampleTexture.createView();
      colorAttachments[0].resolveTarget = this.context.getCurrentTexture().createView();
    } else {
      colorAttachments[0].view = this.context.getCurrentTexture().createView();
      colorAttachments[0].resolveTarget = undefined;
    }

    if (this.depthTexture) {
      const depthStencilAttachment = this.renderPassDescriptor
        .depthStencilAttachment as GPURenderPassDepthStencilAttachment;
      depthStencilAttachment.view = this.depthTexture.createView();
    }
  }

  /**
   * Create depth texture for depth testing
   */
  private createDepthTexture(): void {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: this.depthFormat,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.multisampled ? 4 : 1,
    });
  }

  /**
   * Create multisample texture for antialiasing
   */
  private createMultisampleTexture(): void {
    if (this.multisampleTexture) {
      this.multisampleTexture.destroy();
    }

    this.multisampleTexture = this.device.createTexture({
      size: {
        width: this.canvas.width,
        height: this.canvas.height,
      },
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.multisampled ? 4 : 1,
    });
  }

  /**
   * Handle canvas resize events
   */
  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        const width = entry.contentBoxSize[0].inlineSize;
        const height = entry.contentBoxSize[0].blockSize;

        canvas.width = Math.max(1, Math.min(width, this.device.limits.maxTextureDimension2D));
        canvas.height = Math.max(1, Math.min(height, this.device.limits.maxTextureDimension2D));

        // Recreate render resources on resize
        this.setupRenderResources();
        this.render();
      }
    });

    resizeObserver.observe(this.canvas);
  }

  /**
   * Get or create a render pipeline for a specific primitive type
   */
  private getRenderPipeline(type: GeometryPrimitiveType): GPURenderPipeline {
    const existingPipeline = this.renderPipelines.get(type);
    if (!existingPipeline) {
      this.createRenderPipeline(type);
      return this.renderPipelines.get(type) ?? this.createFallbackPipeline();
    }
    return existingPipeline;
  }

  /**
   * Create a fallback pipeline in case the regular pipeline creation fails
   * Should only be used in exceptional circumstances
   */
  private createFallbackPipeline(): GPURenderPipeline {
    const defaultShaderCode = this.getShaderCodeForType(GeometryPrimitiveType.LINE);
    const module = this.device.createShaderModule({
      label: "fallback shader",
      code: defaultShaderCode,
    });

    return this.device.createRenderPipeline({
      label: "fallback pipeline",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs",
        buffers: this.getVertexBufferLayoutForType(GeometryPrimitiveType.LINE),
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format: this.format,
          },
        ],
      },
      primitive: {
        topology: "line-list",
      },
    });
  }

  /**
   * Create a render pipeline for a primitive type
   */
  private createRenderPipeline(type: GeometryPrimitiveType): void {
    // Create or get shader module
    let module = this.shaderModules.get(type);

    if (!module) {
      // Get shader code for the primitive type
      const shaderCode = this.getShaderCodeForType(type);

      module = this.device.createShaderModule({
        label: `${type} shader`,
        code: shaderCode,
      });
      this.shaderModules.set(type, module);
    }

    // Determine primitive topology based on type
    const topology = this.getTopologyForType(type);

    // Create render pipeline
    const pipeline = this.device.createRenderPipeline({
      label: `${type} pipeline`,
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs",
        // Vertex buffers defined per primitive type
        buffers: this.getVertexBufferLayoutForType(type),
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
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
            },
          },
        ],
      },
      primitive: {
        topology,
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: this.depthFormat,
      },
      multisample: {
        count: this.multisampled ? 4 : 1,
      },
    });

    this.renderPipelines.set(type, pipeline);
  }

  /**
   * Get the appropriate primitive topology for a type
   */
  private getTopologyForType(type: GeometryPrimitiveType): GPUPrimitiveTopology {
    switch (type) {
      case GeometryPrimitiveType.POINT:
        return "point-list";
      case GeometryPrimitiveType.LINE:
        return "line-list";
      case GeometryPrimitiveType.POLYLINE:
        return "line-strip";
      case GeometryPrimitiveType.TRIANGLE:
        return "triangle-list";
      case GeometryPrimitiveType.RECTANGLE:
      case GeometryPrimitiveType.POLYGON:
        return "triangle-list";
      case GeometryPrimitiveType.CIRCLE:
        return "triangle-strip";
      case GeometryPrimitiveType.GRID:
        return "line-list";
      default:
        return "line-list";
    }
  }

  /**
   * Get vertex buffer layout for a specific primitive type
   * Each type can have specialized layout if needed
   */
  private getVertexBufferLayoutForType(type: GeometryPrimitiveType): GPUVertexBufferLayout[] {
    // This would be customized per primitive type if needed
    // For simplicity, using same layout for all types for now

    // Use the type parameter to avoid linting error, though we're not
    // currently differentiating layouts by type
    if (type === GeometryPrimitiveType.POINT) {
      // Future implementation might have special handling for points
    }

    return [
      {
        arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // x, y
        stepMode: "vertex",
        attributes: [
          {
            shaderLocation: 0,
            offset: 0,
            format: "float32x2",
          },
        ],
      },
    ];
  }

  /**
   * Get shader code for a specific primitive type
   * In production, these would be imported from separate files
   */
  private getShaderCodeForType(type: GeometryPrimitiveType): string {
    // Basic shader for demonstration - would be customized per primitive type

    // Use the type parameter to avoid linting error, though we're not
    // currently differentiating shaders by type
    if (type === GeometryPrimitiveType.POINT) {
      // Future implementation might have special shader code for points
    }

    return `
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };
      
      @group(0) @binding(0) var<uniform> resolution: vec2f;
      @group(0) @binding(1) var<uniform> color: vec4f;
      
      @vertex
      fn vs(@location(0) position: vec2f) -> VertexOutput {
        var output: VertexOutput;
        
        // Convert to clip space
        var pos = position / resolution * 2.0 - 1.0;
        pos.y = -pos.y; // Flip Y for screen coordinates
        
        output.position = vec4f(pos, 0.0, 1.0);
        output.color = color;
        
        return output;
      }
      
      @fragment
      fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
        return color;
      }
    `;
  }

  /**
   * Create or update a GPU buffer for a primitive
   */
  private getOrCreateBuffer(primitive: GeometryPrimitive): GPUBuffer {
    const id = primitive.id;
    const isDirty = this.store.getDirty().some((p) => p.id === id);

    // Reuse cached buffer if primitive hasn't changed
    if (!isDirty && this.gpuBufferCache.has(id)) {
      const cachedBuffer = this.gpuBufferCache.get(id);
      if (cachedBuffer) {
        return cachedBuffer;
      }
    }

    // Cleanup old buffer if it exists
    if (this.gpuBufferCache.has(id)) {
      // Let GPU handle cleanup - buffers will be garbage collected
      this.gpuBufferCache.delete(id);
    }

    // Create a new buffer
    const buffer = this.device.createBuffer({
      label: `primitive-${id}-buffer`,
      size: primitive.data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // Upload data to the buffer
    this.device.queue.writeBuffer(buffer, 0, primitive.data);

    // Cache the buffer
    this.gpuBufferCache.set(id, buffer);

    return buffer;
  }

  /**
   * Create a uniform buffer for color data
   */
  private createColorBuffer(color: Float32Array): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: 4 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(buffer, 0, color);

    return buffer;
  }

  /**
   * Create a resolution uniform buffer
   */
  private createResolutionBuffer(): GPUBuffer {
    const buffer = this.device.createBuffer({
      size: 2 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(buffer, 0, new Float32Array([this.canvas.width, this.canvas.height]));

    return buffer;
  }

  /**
   * Clean up any resources associated with deleted primitives
   */
  private cleanupDeletedPrimitives(): void {
    const deleted = this.store.getDeleted();

    for (const id of deleted) {
      if (this.gpuBufferCache.has(id)) {
        // Let GPU handle cleanup
        this.gpuBufferCache.delete(id);
      }
    }
  }

  /**
   * Render all primitives in the store
   */
  public render(): void {
    // Skip if resources aren't ready
    if (!this.depthTexture) {
      return;
    }

    // Cleanup deleted primitives
    this.cleanupDeletedPrimitives();

    // Update render pass descriptor with current texture view
    const colorAttachments = this.renderPassDescriptor.colorAttachments as GPURenderPassColorAttachment[];

    if (this.multisampled && this.multisampleTexture) {
      colorAttachments[0].resolveTarget = this.context.getCurrentTexture().createView();
    } else {
      colorAttachments[0].view = this.context.getCurrentTexture().createView();
    }

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder();

    // Begin render pass
    const renderPass = commandEncoder.beginRenderPass(this.renderPassDescriptor);

    // Create resolution buffer
    const resolutionBuffer = this.createResolutionBuffer();

    // Render primitives by type to batch similar operations
    for (const type of Object.values(GeometryPrimitiveType)) {
      const primitives = this.store.getByType(type).filter((p) => p.visible);

      if (primitives.length === 0) continue;

      // Get pipeline for this primitive type
      const pipeline = this.getRenderPipeline(type);
      renderPass.setPipeline(pipeline);

      // Render each primitive of this type
      for (const primitive of primitives) {
        // Get or create the vertex buffer
        const vertexBuffer = this.getOrCreateBuffer(primitive);

        // Create color buffer (default white if not specified)
        const colorBuffer = this.createColorBuffer(primitive.color || new Float32Array([1.0, 1.0, 1.0, 1.0]));

        // Create bind group
        const bindGroup = this.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: resolutionBuffer } },
            { binding: 1, resource: { buffer: colorBuffer } },
          ],
        });

        // Set bind group and vertex buffer
        renderPass.setBindGroup(0, bindGroup);
        renderPass.setVertexBuffer(0, vertexBuffer);

        // Draw the primitive
        const vertexCount = primitive.data.length / 2; // Assuming 2 floats per vertex (x,y)
        renderPass.draw(vertexCount);
      }
    }

    // End render pass
    renderPass.end();

    // Submit command buffer
    this.device.queue.submit([commandEncoder.finish()]);

    // Clear change tracking state
    this.store.clearChangeTracking();
  }
}
