import { invariant } from "../../utils/invariant.ts";
import { Vec2 } from "./math/Vec2.ts";
import { Vec4 } from "./math/Vec4.ts";
import { Lookups } from "./prepareLookups.ts";
import { getTextShape, Shape } from "./shapeText.ts";
import shaderCode from "./shaders/text.shader.wgsl?raw";

const TEXT_BUFFER_SIZE = 16 * 1000;

const SAMPLE_COUNT = 4;

interface FontRendererProps {
  device: GPUDevice;
  context: GPUCanvasContext;
  colorTextureView: GPUTextureView;
  width: number;
  height: number;
  clearValue: GPUColorDict;
  fontColorValue: GPUColorDict;
}

interface TextShape {
  bounds: Shape["boundingRectangle"];
  position: Vec2;
  fontSize: number;
}

export class FontRenderer {
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
  clearValue: GPUColorDict;
  fontColorValue: GPUColorDict;
  width: number;
  height: number;

  constructor(props: FontRendererProps) {
    const { device, context, colorTextureView, width, height, clearValue, fontColorValue } = props;

    this.device = device;
    this.colorTextureView = colorTextureView;
    this.context = context;
    this.width = width;
    this.height = height;
    this.clearValue = clearValue;
    this.fontColorValue = fontColorValue;

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

  text(text: string, position: Vec2, fontSize: number, color?: Vec4): TextShape {
    invariant(this.fontLookups, "Font must be set.");
    const shape = getTextShape(this.fontLookups, text, fontSize);

    for (let i = 0; i < shape.positions.length; i++) {
      const shapePosition = shape.positions[i].add(position);
      const size = shape.sizes[i];

      const uv = this.fontLookups.uvs.get(text[i].charCodeAt(0));
      invariant(uv, "UV does not exist.");

      const colorRed = color?.x ?? this.fontColorValue?.r;
      const colorGreen = color?.y ?? this.fontColorValue?.g;
      const colorBlue = color?.z ?? this.fontColorValue?.b;
      const colorOpacity = color?.w ?? this.fontColorValue?.a;

      const struct = 16;
      const startPosition = this.glyphCount * struct;

      // text char position
      this.glyphData[startPosition] = shapePosition.x;
      this.glyphData[startPosition + 1] = shapePosition.y;
      this.glyphData[startPosition + 2] = position.y;
      this.glyphData[startPosition + 3] = fontSize;

      // text char color
      this.glyphData[startPosition + 4] = colorRed;
      this.glyphData[startPosition + 5] = colorGreen;
      this.glyphData[startPosition + 6] = colorBlue;
      this.glyphData[startPosition + 7] = colorOpacity;

      const pixelRatioWidth = this.width / window.devicePixelRatio;
      const pixelRatioHeight = this.height / window.devicePixelRatio;
      // text char size
      this.glyphData[startPosition + 8] = size.x;
      this.glyphData[startPosition + 9] = size.y;
      this.glyphData[startPosition + 10] = uv.x;
      this.glyphData[startPosition + 11] = uv.y;
      this.glyphData[startPosition + 12] = uv.z;
      this.glyphData[startPosition + 13] = uv.w;
      this.glyphData[startPosition + 14] = pixelRatioWidth;
      this.glyphData[startPosition + 15] = pixelRatioHeight;

      this.glyphCount += 1;
    }

    return {
      bounds: shape.boundingRectangle,
      position,
      fontSize,
    };
  }

  render(): void {
    invariant(this.context, "Context does not exist.");

    const commandEncoder = this.device.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.colorTextureView,
          resolveTarget: this.context.getCurrentTexture().createView({ label: "antialiased resolve target" }),
          // This is background color.
          clearValue: this.clearValue,
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
