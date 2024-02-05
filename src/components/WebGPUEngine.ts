import { ChartSettings } from "./Chart.ts";
import ElementSizeWatcher from "./ElementSizeWatcher.ts";

export interface WebGPUEngineSettings {
  debug?: boolean;
  log?: boolean;
}

class WebGPUEngine {
  device!: GPUDevice;
  context!: GPUCanvasContext;
  canvas: HTMLCanvasElement;
  settings?: ChartSettings;

  constructor(canvas: HTMLCanvasElement, settings?: ChartSettings) {
    this.canvas = canvas;
    this.settings = settings ?? { debug: false, log: false };

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
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" });
      if (!adapter) {
        this.error("WebGPU adapter is not available.");
        return;
      }

      const device = await adapter.requestDevice({
        requiredLimits: {
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
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

  private observeSizeChanges(canvas: HTMLCanvasElement, postCall?: (width: number, height: number) => void) {
    new ElementSizeWatcher(canvas, (width, height) => {
      canvas.width = width;
      canvas.height = height;

      this.debug("New width:", width, ", new height:", height);

      postCall?.(width, height);
    });
  }

  render(renderFunction: (device: GPUDevice, context: GPUCanvasContext, width: number, height: number) => Promise<void> | void) {
    this.observeSizeChanges(this.canvas, async (width, height) => {
      this.log("Observing canvas size changes");

      await this.initialize(this.canvas);

      if (!renderFunction) {
        this.error("No render function provided");

        return;
      }

      renderFunction(this.device, this.context, width, height);
    });
  }
}

export default WebGPUEngine;
