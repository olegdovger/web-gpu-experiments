import { invariant } from "../fonts/invariant.ts";
import WebGPUEngine, { RenderFn } from "./WebGPUEngine.ts";

export interface ChartSettings {
  debug?: boolean;
  log?: boolean;
  fontSource?: string;
}

class Chart {
  private engine: WebGPUEngine;
  private settings: ChartSettings;

  constructor(element: HTMLElement | null, settings?: ChartSettings) {
    const canvas = document.createElement("canvas");

    if (!element) throw new Error("No element provided");

    element.appendChild(canvas);
    element.style.overflow = "hidden";
    element.style.width = "100%";
    element.style.height = "100%";

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

  async render(renderFunction: RenderFn) {
    if (!renderFunction) {
      this.error("No render function provided");

      return;
    }

    this.engine.render(async ({device, context, width, height, font}) => {
      renderFunction({device, context, width, height, font});
    });
  }
}

export default Chart;
