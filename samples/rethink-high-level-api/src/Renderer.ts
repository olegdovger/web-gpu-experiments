import setCanvasResizeObserver from "~/utils/setCanvasResizeObserver";
import { Store } from "./Store";
import { clearValue } from "~/constants";
import setupDevice from "~/utils/setupDevice";
import { PolylineRenderer } from "./renderers/PolylineRenderer";
import { GridRenderer } from "./renderers/GridRenderer";

export interface RendererOptions {
  multisampled: boolean;
  depthFormat: GPUTextureFormat;
  clearColor: GPUColorDict;
}

export interface GPUConfig {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

export class Renderer {
  private store: Store;
  private options: RendererOptions;
  private canvas: HTMLCanvasElement;
  private polylineRenderer: PolylineRenderer;
  private gridRenderer: GridRenderer;

  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;

  private gpuBufferCache: Map<string, GPUBuffer> = new Map();

  constructor(canvas: HTMLCanvasElement, options: RendererOptions, gpuConfig: GPUConfig) {
    const { multisampled = true, depthFormat = "depth24plus", clearColor = clearValue } = options || {};

    this.store = new Store();
    this.options = {
      multisampled,
      depthFormat,
      clearColor,
    };
    this.canvas = canvas;

    this.device = gpuConfig.device;
    this.context = gpuConfig.context;
    this.format = gpuConfig.format;

    const sampleCount = this.options.multisampled ? 4 : 1;
    this.polylineRenderer = new PolylineRenderer(this.device, this.format, sampleCount);

    this.gridRenderer = new GridRenderer(this.device, this.format, sampleCount);

    this.store.subscribe(this.render.bind(this));
    setCanvasResizeObserver(this.canvas, this.device, this.render.bind(this));
  }

  public static async setup(canvas: HTMLCanvasElement) {
    const { device, context, format } = await setupDevice(canvas);

    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });

    return { device, context, format };
  }

  public static async init(canvas: HTMLCanvasElement, options: RendererOptions) {
    const { device, context, format } = await this.setup(canvas);

    return new Renderer(canvas, options, {
      device,
      context,
      format,
    });
  }

  public getStore(): Store {
    return this.store;
  }

  private cleanupDeletedPrimitives(): void {
    const deleted = this.store.getDeleted();

    for (const id of deleted) {
      this.gpuBufferCache.delete(id);
    }
  }

  public render(): void {
    this.cleanupDeletedPrimitives();

    const commandEncoder = this.device.createCommandEncoder();
    const canvasTexture = this.context.getCurrentTexture();
    const canvasTextureView = canvasTexture.createView();

    // Create depth texture for the render pass
    const depthTexture = this.device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: this.options.multisampled ? 4 : 1,
    });
    const depthTextureView = depthTexture.createView();

    // Create multisampled texture if needed
    const sampleCount = this.options.multisampled ? 4 : 1;

    const multisampledTexture = this.device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount,
    });
    const multisampledTextureView = multisampledTexture.createView();

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "Render Pass",
      colorAttachments: [
        {
          loadOp: "clear",
          storeOp: "store",
          clearValue: this.options.clearColor,
          view: sampleCount > 1 ? multisampledTextureView : canvasTextureView,
          resolveTarget: sampleCount > 1 ? canvasTextureView : undefined,
        },
      ],
      depthStencilAttachment: {
        view: depthTextureView,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

    // Render grid if configured
    this.gridRenderer.render(renderPass, canvasTexture);

    // Render polylines
    const polylines = this.store.getByType("polyline");
    this.polylineRenderer.render(renderPass, canvasTexture, polylines);

    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);

    this.store.clearChangeTracking();
  }
}
