import commonSettings from "../common.settings.ts";
import WebGPUEngine, { EngineSettings, RenderFn } from "./WebGPUEngine.ts";

class Sample {
  private engine: WebGPUEngine;
  private settings: EngineSettings;

  constructor(element: HTMLElement | null, settings?: EngineSettings) {
    const canvas = document.createElement("canvas");

    if (!element) throw new Error("No element provided");

    element.appendChild(canvas);
    element.style.overflow = "hidden";
    element.style.width = "100%";
    element.style.height = "100%";

    this.settings = settings ?? commonSettings;

    this.log("initialize");

    this.engine = new WebGPUEngine(canvas, this.settings);
  }

  private log(...args: unknown[]) {
    if (!this.settings?.log) return;

    console.log("Chart:", ...args);
  }

  private error(...args: unknown[]) {
    console.error("Chart:", ...args);
  }

  async render(renderFunction: RenderFn) {
    if (!renderFunction) {
      this.error("No render function provided");

      return;
    }

    this.engine.render(async ({ device, context, width, height, font }) => {
      renderFunction({ device, context, width, height, font });
    });
  }
}

export default Sample;
