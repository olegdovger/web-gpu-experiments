import shader from "./shaders/text.shader.wgsl?raw";
import { FontArtefacts, MsdfChar, MsdfTextMeasurements } from "./types";
import { MsdfFont } from "./MsdfFont";
import { MsdfText } from "./MsdfText";
import { mat4, Mat4 } from "wgpu-matrix";
import { fetchFontArtefacts } from "./utils/fetchFontArtefacts";
import { assert } from "~/utils/assert";
import hexToGPUVec4f from "~/utils/hexToGPUVec4f";
import { ortho } from "~/utils/ortho";
import debugRectShader from "./shaders/debugRect.wgsl?raw";

interface MsdfTextFormattingOptions {
  centered?: boolean;
  fontSize?: number;
  color?: string;
  offsetTop?: number;
  offsetLeft?: number;
}

export default class MsdfTextRenderer {
  fontBindGroupLayout: GPUBindGroupLayout;
  textBindGroupLayout: GPUBindGroupLayout;
  canvasSizeBindGroupLayout: GPUBindGroupLayout;

  pipeline: GPURenderPipeline;
  sampler: GPUSampler;
  cameraUniformBuffer: GPUBuffer;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  context: GPUCanvasContext;

  sampleCount: number;

  texts: Set<MsdfText> = new Set();

  renderBundleDescriptor: GPURenderBundleEncoderDescriptor;
  cameraArray: Float32Array = new Float32Array(16 * 2);

  font?: MsdfFont;

  depthStencilAttachment: GPURenderPassDepthStencilAttachment;
  renderPassDescriptor: GPURenderPassDescriptor;
  colorAttachment: GPURenderPassColorAttachment;
  projectionMatrix: Float32Array;

  debug: boolean;

  canvasSizeBuffer?: GPUBuffer;

  constructor({
    device,
    canvas,
    context,
    clearColor,
    debug = false,
  }: {
    device: GPUDevice;
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    clearColor: string;
    debug?: boolean;
  }) {
    const colorFormat = navigator.gpu.getPreferredCanvasFormat();

    this.device = device;
    this.canvas = canvas;
    this.context = context;

    this.sampleCount = 1;
    this.debug = debug;

    this.renderBundleDescriptor = {
      colorFormats: [colorFormat],
      depthStencilFormat: "depth24plus",
      sampleCount: 1,
    };

    this.sampler = device.createSampler({
      label: "MSDF text sampler",
      minFilter: "linear",
      magFilter: "linear",
      mipmapFilter: "linear",
      maxAnisotropy: 16,
    });

    this.cameraUniformBuffer = device.createBuffer({
      label: "MSDF camera uniform buffer",
      size: this.cameraArray.byteLength,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM,
    });

    this.fontBindGroupLayout = device.createBindGroupLayout({
      label: "MSDF font group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    this.textBindGroupLayout = device.createBindGroupLayout({
      label: "MSDF text group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {},
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    this.canvasSizeBindGroupLayout = device.createBindGroupLayout({
      label: "MSDF canvas size group layout",
      entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }],
    });

    const shaderModule = device.createShaderModule({
      label: "MSDF text shader",
      code: shader,
    });

    this.pipeline = device.createRenderPipeline({
      label: `msdf text pipeline`,
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.fontBindGroupLayout, this.textBindGroupLayout, this.canvasSizeBindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: "vertexMain",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: colorFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-strip",
        stripIndexFormat: "uint32",
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "less",
        format: "depth24plus",
      },
      multisample: {
        count: 1,
      },
    });

    this.colorAttachment = {
      view: context.getCurrentTexture().createView(),
      clearValue: hexToGPUVec4f(clearColor),
      loadOp: "clear",
      storeOp: "store",
    };

    this.depthStencilAttachment = {
      view: device
        .createTexture({
          size: [canvas.width, canvas.height],
          format: "depth24plus",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        .createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    };

    this.renderPassDescriptor = {
      colorAttachments: [this.colorAttachment],
      depthStencilAttachment: this.depthStencilAttachment,
    };

    this.projectionMatrix = ortho(canvas.width, canvas.height);

    window.addEventListener("resize", () => {
      this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
      this.canvas.height = this.canvas.clientHeight * devicePixelRatio;

      this.depthStencilAttachment.view = this.device
        .createTexture({
          size: [this.canvas.width, this.canvas.height],
          format: "depth24plus",
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        .createView();

      this.projectionMatrix = ortho(this.canvas.width, this.canvas.height);

      assert(this.canvasSizeBuffer, "Canvas size buffer must be created before resizing");
      const canvasSize = new Float32Array([
        this.canvas.width / devicePixelRatio,
        this.canvas.height / devicePixelRatio,
      ]);

      console.log(canvasSize);

      this.device.queue.writeBuffer(this.canvasSizeBuffer, 0, canvasSize);

      this.render();
    });
  }

  fetchFontArtefacts(url: string): Promise<FontArtefacts> {
    return fetchFontArtefacts(url, this.device);
  }

  async loadFont(url: string): Promise<MsdfFont> {
    const fontArtefacts = await this.fetchFontArtefacts(url);

    const { json, pageTextures, kernings } = fontArtefacts;

    const charCount = json.chars.length;
    const charsBuffer = this.device.createBuffer({
      label: "MSDF character layout buffer",
      size: charCount * Float32Array.BYTES_PER_ELEMENT * 8,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });

    const charsArray = new Float32Array(charsBuffer.getMappedRange());

    const u = 1 / json.common.scaleW;
    const v = 1 / json.common.scaleH;

    const chars: { [x: number]: MsdfChar } = {};

    let offset = 0;
    for (const [i, char] of json.chars.entries()) {
      chars[char.id] = char;
      chars[char.id].charIndex = i;
      charsArray[offset] = char.x * u; // texOffset.x
      charsArray[offset + 1] = char.y * v; // texOffset.y
      charsArray[offset + 2] = char.width * u; // texExtent.x
      charsArray[offset + 3] = char.height * v; // texExtent.y
      charsArray[offset + 4] = char.width; // size.x
      charsArray[offset + 5] = char.height; // size.y
      charsArray[offset + 6] = char.xoffset; // offset.x
      charsArray[offset + 7] = -1 * char.yoffset; // offset.y
      offset += 8;
    }

    charsBuffer.unmap();

    const bindGroup = this.device.createBindGroup({
      label: "msdf font bind group",
      layout: this.fontBindGroupLayout,
      entries: [
        {
          binding: 0,
          // TODO: Allow multi-page fonts
          resource: pageTextures[0].createView(),
        },
        {
          binding: 1,
          resource: this.sampler,
        },
        {
          binding: 2,
          resource: { buffer: charsBuffer },
        },
      ],
    });

    this.font = new MsdfFont({
      pipeline: this.pipeline,
      bindGroup,
      lineHeight: json.common.lineHeight,
      lineBase: json.common.base,
      size: json.info.size,
      chars,
      kernings,
    });

    return this.font;
  }

  formatText(text: string, options: MsdfTextFormattingOptions = {}): void {
    assert(this.font, "Font must be loaded before formatting text");

    const textBuffer = this.device.createBuffer({
      label: "msdf text buffer",
      size: (6 + text.length) * Float32Array.BYTES_PER_ELEMENT * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    const textArray = new Float32Array(textBuffer.getMappedRange());
    let offset = 6 * 4; // Accounts for the values managed by MsdfText internally.

    let measurements: MsdfTextMeasurements;
    if (options.centered) {
      measurements = this.measureText(this.font, text);

      this.measureText(this.font, text, (textX: number, textY: number, line: number, char: MsdfChar) => {
        const lineOffset = measurements.width * -0.5 - (measurements.width - measurements.lineWidths[line]) * -0.5;

        textArray[offset] = textX + lineOffset;
        textArray[offset + 1] = textY + measurements.height * 0.5;
        textArray[offset + 2] = char.charIndex;
        offset += 4;
      });
    } else {
      measurements = this.measureText(
        this.font,
        text,
        (textX: number, textY: number, _line: number, char: MsdfChar) => {
          textArray[offset] = textX;
          textArray[offset + 1] = textY;
          textArray[offset + 2] = char.charIndex;
          offset += 4;
        },
      );
    }

    textBuffer.unmap();

    const textOffsetBuffer = this.device.createBuffer({
      label: "msdf text offset buffer",
      size: 2 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    const textOffsetArray = new Float32Array(textOffsetBuffer.getMappedRange());
    textOffsetArray[0] = options.offsetLeft ?? 0;
    textOffsetArray[1] = options.offsetTop ?? 0;

    textOffsetBuffer.unmap();

    const bindGroup = this.device.createBindGroup({
      label: "msdf text bind group",
      layout: this.textBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.cameraUniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: textBuffer },
        },
        {
          binding: 2,
          resource: { buffer: textOffsetBuffer },
        },
      ],
    });

    this.canvasSizeBuffer = this.device.createBuffer({
      size: 2 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    assert(this.canvasSizeBuffer, "Canvas size buffer must be created before resizing");
    const canvasSize = new Float32Array([this.canvas.width / devicePixelRatio, this.canvas.height / devicePixelRatio]);

    this.device.queue.writeBuffer(this.canvasSizeBuffer, 0, canvasSize);

    const canvasSizeBindGroup = this.device.createBindGroup({
      layout: this.canvasSizeBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.canvasSizeBuffer },
        },
      ],
      label: "canvas size bind group",
    });

    const encoder = this.device.createRenderBundleEncoder(this.renderBundleDescriptor);
    encoder.setPipeline(this.font.pipeline);
    encoder.setBindGroup(0, this.font.bindGroup);
    encoder.setBindGroup(1, bindGroup);
    encoder.setBindGroup(2, canvasSizeBindGroup);
    encoder.draw(4, measurements.printedCharCount);
    const renderBundle = encoder.finish();

    const msdfText = new MsdfText({
      device: this.device,
      renderBundle,
      measurements,
      font: this.font,
      textBuffer,
      offsetLeft: options.offsetLeft ?? 0,
      offsetTop: options.offsetTop ?? 0,
    });

    const fontSize = options.fontSize ?? 16;
    const scale = (fontSize / this.font.lineHeight) * devicePixelRatio;

    msdfText.setPixelScale(scale);

    if (options.color !== undefined) {
      msdfText.setColor(...hexToGPUVec4f(options.color));
    }

    this.texts.add(msdfText);
  }

  measureText(
    font: MsdfFont,
    text: string,
    charCallback?: (x: number, y: number, line: number, char: MsdfChar) => void,
  ): MsdfTextMeasurements {
    let maxWidth = 0;
    const lineWidths: number[] = [];

    let textOffsetX = 0;
    let textOffsetY = 0;
    let line = 0;
    let printedCharCount = 0;
    let nextCharCode = text.charCodeAt(0);

    for (let i = 0; i < text.length; ++i) {
      const charCode = nextCharCode;
      nextCharCode = i < text.length - 1 ? text.charCodeAt(i + 1) : -1;

      switch (charCode) {
        case 10: // Newline
          lineWidths.push(textOffsetX);
          line++;
          maxWidth = Math.max(maxWidth, textOffsetX);
          textOffsetX = 0;
          textOffsetY -= font.lineHeight;
          break;
        case 13: // CR
          break;
        case 32: // Space
          // For spaces, advance the offset without actually adding a character.
          textOffsetX += font.getXAdvance(charCode);
          break;
        default: {
          if (charCallback) {
            charCallback(textOffsetX, textOffsetY, line, font.getChar(charCode));
          }
          textOffsetX += font.getXAdvance(charCode, nextCharCode);
          printedCharCount++;
        }
      }
    }

    lineWidths.push(textOffsetX);
    maxWidth = Math.max(...lineWidths);

    return {
      width: maxWidth,
      height: (line + 1) * font.lineBase,
      lineWidths,
      printedCharCount,
      lineCount: line + 1,
      lineHeight: font.lineHeight,
      textOffsetY,
    };
  }

  updateCamera(projection: Mat4, view: Mat4) {
    this.cameraArray.set(projection, 0);
    this.cameraArray.set(view, 16);
    this.device.queue.writeBuffer(this.cameraUniformBuffer, 0, this.cameraArray);
  }

  render() {
    this.colorAttachment.view = this.context.getCurrentTexture().createView();

    const commandEncoder = this.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);

    const viewMatrix = mat4.identity();
    this.updateCamera(this.projectionMatrix, viewMatrix);

    const renderBundles = Array.from(this.texts).map((t) => t.getRenderBundle());

    passEncoder.executeBundles(renderBundles);

    if (this.debug) {
      for (const text of Array.from(this.texts)) {
        this.drawRect({ passEncoder, text, color: "#FF0000" });
      }
    }

    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }

  drawRect({ passEncoder, text, color }: { passEncoder: GPURenderPassEncoder; text: MsdfText; color: string }) {
    // // Get bounding box from text measurements
    const x = ((2.0 * text.offsetLeft) / this.canvas.width) * devicePixelRatio;
    const y = ((2.0 * text.offsetTop) / this.canvas.height) * devicePixelRatio;
    const width = (text.measurements.width / this.canvas.width) * devicePixelRatio;
    const height = (text.measurements.height / this.canvas.height) * devicePixelRatio;

    console.log(
      JSON.stringify(text.measurements, null, 2),
      2 + (1 * text.measurements.textOffsetY) / this.canvas.height / devicePixelRatio,
      height,
    );

    // Rectangle corners (clockwise)
    // 1. Top left
    // 2. Top right
    // 3. Bottom right
    // 4. Bottom left
    // 5. Top left (again to close the loop)

    const topLeftCorner = [x, y];
    const topRightCorner = [x + width, y];
    const bottomRightCorner = [x + width, y + height];
    const bottomLeftCorner = [x, y + height];

    const vertices = new Float32Array([
      ...topLeftCorner,
      ...topRightCorner,
      ...bottomRightCorner,
      ...bottomLeftCorner,
      ...topLeftCorner,
    ]);

    // Create vertex buffer
    const vertexBuffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(vertexBuffer, 0, vertices);

    // Color as vec4
    const colorVec = new Float32Array(hexToGPUVec4f(color));
    const colorBuffer = this.device.createBuffer({
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(colorBuffer, 0, colorVec);

    // Pipeline
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: this.device.createShaderModule({ code: debugRectShader }),
        entryPoint: "main_vertex",
        buffers: [
          {
            arrayStride: 2 * 4,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
          },
        ],
      },
      fragment: {
        module: this.device.createShaderModule({ code: debugRectShader }),
        entryPoint: "main_fragment",
        targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
      },
      primitive: { topology: "line-strip" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "always",
      },
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setBindGroup(
      0,
      this.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: colorBuffer } }],
      }),
    );
    passEncoder.draw(5);
    // passEncoder.end();
    // device.queue.submit([this.device.createCommandEncoder().finish()]);
  }
}
