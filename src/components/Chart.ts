import WebGPUEngine from "./WebGPUEngine.ts";

export interface ChartSettings {
  debug?: boolean;
  log?: boolean;
}

class Chart {
  private engine: WebGPUEngine;
  private settings: ChartSettings;

  constructor(element: HTMLElement | null, settings?: ChartSettings) {
    const canvas = document.createElement("canvas");

    if (!element) throw new Error("No element provided");

    element.appendChild(canvas);
    element.style.overflow = "hidden";

    this.settings = settings ?? { debug: true, log: true };

    this.log("initialize");

    this.engine = new WebGPUEngine(canvas, settings);
  }

  private log(...args: any[]) {
    if (!this.settings?.log) return;

    console.log("Chart:", ...args);
  }

  private error(...args: any[]) {
    console.error("Chart:", ...args);
  }

  render(renderFunction: (device: GPUDevice, context: GPUCanvasContext, width: number, height: number) => Promise<void> | void) {
    if (!renderFunction) {
      this.error("No render function provided");

      return;
    }

    this.engine.render((device, context, width, height) => {
      renderFunction(device, context, width, height);
    });
  }
}

export default Chart;
