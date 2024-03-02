import { FontRenderer } from "../fonts/FontRenderer.ts";
import { invariant } from "../fonts/invariant.ts";
import ElementSizeWatcher from "./ElementSizeWatcher.ts";
import initFontRenderer, {
  LoadFontProps,
  LoadFontSettings,
} from "./WebGPUEngine/initFontRenderer.ts";

export interface EngineSettings {
  clearValue: GPUColorDict;
  fontColorValue: GPUColorDict;
  fontSource: string;

  debug?: boolean;
  log?: boolean;
  debounceInterval?: number;
}

interface RenderFnProps {
  device: GPUDevice;
  context: GPUCanvasContext;
  width: number;
  height: number;
  font: FontRenderer;
}

export type RenderFn = (props: RenderFnProps) => Promise<void> | void;

class WebGPUEngine {
  device!: GPUDevice;
  context!: GPUCanvasContext;
  canvas: HTMLCanvasElement;
  settings: EngineSettings;

  constructor(canvas: HTMLCanvasElement, settings: EngineSettings) {
    this.canvas = canvas;
    this.settings = settings;

    this.debug("initialized");
  }

  private log(...args: any[]) {
    if (!this.settings?.log) return;

    console.log("WebGPUEngine:", ...args);
  }

  private debug(...args: any[]) {
    if (!this.settings?.debug) return;

    console.debug("WebGPUEngine:", ...args);
  }

  private error(...args: any[]) {
    console.error("WebGPUEngine:", ...args);
  }

  private async initialize(canvas: HTMLCanvasElement) {
    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "low-power",
      });
      if (!adapter) {
        this.error("WebGPU adapter is not available.");
        return;
      }

      const device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize:
            adapter.limits.maxStorageBufferBindingSize,
        },
      });

      this.device = device;

      device.lost.then(async (info) => {
        this.error(`WebGPU device was lost: ${info.message}`);

        if (info.reason !== "destroyed") {
          await this.initialize(canvas);

          this.log("WebGPU device was re-initialized.");
        }
      });

      const context = canvas.getContext("webgpu");

      if (!context) return;

      this.context = context;

      if (!context) {
        this.error("WebGPU context is not available.");
        return;
      }

      context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
      });
    } catch (e) {
      this.error("Error initializing WebGPU: ", e);
    }
  }

  private observeSizeChanges(
    canvas: HTMLCanvasElement,
    postCall?: (width: number, height: number) => Promise<void>,
  ) {
    new ElementSizeWatcher(
      canvas,
      this.settings?.debounceInterval,
      async (width, height) => {
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;

        this.debug("New width:", width, ", new height:", height);

        await postCall?.(width, height);

        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      },
    );
  }

  render(postRender: RenderFn) {
    this.observeSizeChanges(this.canvas, async (width, height) => {
      this.log("Observing canvas size changes");

      await this.initialize(this.canvas);

      const loadedFont = await this.loadFont(
        {
          fontSource: this.settings?.fontSource,
          device: this.device,
          canvas: this.canvas,
          context: this.context,
        },
        {
          debug: this.settings.debug ?? false,
          clearValue: this.settings.clearValue,
          fontColorValue: this.settings.fontColorValue,
          width,
          height,
        },
      );

      invariant(postRender, "No post-render function provided");

      postRender({
        device: this.device,
        context: this.context,
        font: loadedFont,
        width,
        height,
      });
    });
  }

  loadFont(
    props: LoadFontProps,
    settings: LoadFontSettings,
  ): Promise<FontRenderer> {
    return initFontRenderer({ ...props }, { ...settings });
  }
}

export default WebGPUEngine;
