import { invariant } from "./invariant";
import { Vec2 } from "./math/Vec2";
import { Vec4 } from "./math/Vec4";
import { Lookups } from "./prepareLookups";
import { getTextShape } from "./shapeText";
import shaderCode from "./shaders/text.shader.wgsl?raw";

const TEXT_BUFFER_SIZE = 16 * 1000;

const SAMPLE_COUNT = 4;

interface FontRendererProps {
  device: GPUDevice;
  context: GPUCanvasContext;
  colorTextureView: GPUTextureView;
  width: number;
  height: number;
}
interface BaseFontRenderer {
  setFont: (lookups: Lookups, fontAtlasTexture: GPUTexture) => void;
  text: (text: string, position: Vec2, fontSize: number, color: Vec4) => void;
  render: () => void;
}

export class EmptyFontRenderer implements BaseFontRenderer {
  text(_text: string, _position: Vec2, _fontSize: number, _color: Vec4) {
    console.warn(
      "Method 'text' not implemented. You might forget to use 'fontSource'"
    );
  }
  render() {
    console.warn(
      "Method 'render' Not implemented. You might forget to use 'fontSource'"
    );
  }
  setFont(_lookups: Lookups, _fontAtlasTexture: GPUTexture) {
    console.warn(
      "Method 'setFont' Not implemented. You might forget to use 'fontSource'"
    );
  }
}

export class FontRenderer extends EmptyFontRenderer {
  glyphData: Float32Array = new Float32Array(TEXT_BUFFER_SIZE);
  glyphCount: number = 0;

  vertexBuffer: GPUBuffer;
  textBuffer: GPUBuffer;
  textBindGroupLayout: GPUBindGroupLayout;
  textBindGroup: GPUBindGroup | null = null;
  textPipeline: GPURenderPipeline;

  sampler: GPUSampler;
  fontLookups: Lookups | null = null;

  device: GPUDevice;
  context: GPUCanvasContext;
  colorTextureView: GPUTextureView;
  width: number;
  height: number;

  constructor(props: FontRendererProps) {
    super();

    const { device, context, colorTextureView, width, height } = props;

    this.device = device;
    this.colorTextureView = colorTextureView;
    this.context = context;
    this.width = width;
    this.height = height;

    const textModule = device.createShaderModule({ code: shaderCode });

    this.vertexBuffer = device.createBuffer({
      label: "vertex",
      // Just two triangles.
      size: 2 * 2 * 3 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.textBuffer = device.createBuffer({
      label: "text",
      size: TEXT_BUFFER_SIZE * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    this.textBindGroupLayout = device.createBindGroupLayout({
      label: "text bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
      ],
    });

    const textPipelineLayout = device.createPipelineLayout({
      label: "text pipeline layout",
      bindGroupLayouts: [this.textBindGroupLayout],
    });

    this.sampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });

    this.textPipeline = device.createRenderPipeline({
      label: "text",
      layout: textPipelineLayout,
      vertex: {
        module: textModule,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
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
        module: textModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
              alpha: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
            },
          },
        ],
        constants: {
          devicePixelRatio: window.devicePixelRatio,
        },
      },
      multisample: { count: SAMPLE_COUNT },
    });

    // Just regular full-screen quad consisting of two triangles.
    const vertices = [0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1];

    device.queue.writeBuffer(this.vertexBuffer, 0, new Float32Array(vertices));
  }

  setFont(lookups: Lookups, fontAtlasTexture: GPUTexture): void {
    this.fontLookups = lookups;
    this.textBindGroup = this.device.createBindGroup({
      label: "text",
      layout: this.textBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.textBuffer },
        },
        {
          binding: 1,
          resource: this.sampler,
        },
        {
          binding: 2,
          resource: fontAtlasTexture.createView(),
        },
      ],
    });
  }

  text(text: string, position: Vec2, fontSize: number, color: Vec4): void {
    invariant(this.fontLookups, "Font must be set.");
    const shape = getTextShape(this.fontLookups, text, fontSize);

    let totalSizeWidth = 0;

    for (let i = 0; i < shape.positions.length; i++) {
      let shapePosition = shape.positions[i].add(position);
      let size = shape.sizes[i];

      let uv = this.fontLookups.uvs.get(text[i].charCodeAt(0));
      invariant(uv, "UV does not exist.");

      const struct = 16;
      this.glyphData[this.glyphCount * struct + 0] = shapePosition.x;
      this.glyphData[this.glyphCount * struct + 1] = shapePosition.y;
      this.glyphData[this.glyphCount * struct + 2] = 0;
      this.glyphData[this.glyphCount * struct + 3] = fontSize;
      this.glyphData[this.glyphCount * struct + 4] = color.x;
      this.glyphData[this.glyphCount * struct + 5] = color.y;
      this.glyphData[this.glyphCount * struct + 6] = color.z;
      this.glyphData[this.glyphCount * struct + 7] = color.w;
      this.glyphData[this.glyphCount * struct + 8] = size.x;
      this.glyphData[this.glyphCount * struct + 9] = size.y;
      this.glyphData[this.glyphCount * struct + 10] = uv.x;
      this.glyphData[this.glyphCount * struct + 11] = uv.y;
      this.glyphData[this.glyphCount * struct + 12] = uv.z;
      this.glyphData[this.glyphCount * struct + 13] = uv.w;
      this.glyphData[this.glyphCount * struct + 14] =
        this.width / window.devicePixelRatio;
      this.glyphData[this.glyphCount * struct + 15] =
        this.height / window.devicePixelRatio;

      this.glyphCount += 1;

      totalSizeWidth += size.x;
    }
  }

  render(): void {
    invariant(this.context, "Context does not exist.");

    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.colorTextureView,
          resolveTarget: this.context
            .getCurrentTexture()
            .createView({ label: "antialiased resolve target" }),
          // This is background color.
          clearValue: { r: 1, g: 1, b: 1, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    this.device.queue.writeBuffer(this.textBuffer, 0, this.glyphData);

    renderPass.setViewport(0, 0, this.width, this.height, 0, 1);
    renderPass.setVertexBuffer(0, this.vertexBuffer);

    renderPass.setPipeline(this.textPipeline);
    renderPass.setBindGroup(0, this.textBindGroup);
    renderPass.draw(6, this.glyphCount);

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    this.glyphCount = 0;
    this.glyphData = new Float32Array(TEXT_BUFFER_SIZE);
  }
}
