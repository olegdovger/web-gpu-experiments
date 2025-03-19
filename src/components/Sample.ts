import commonSettings from "../common.settings.ts";
import { invariant } from "../utils/invariant.ts";
import WebGPUEngine, { EngineSettings, RenderFn } from "./WebGPUEngine.ts";

class Sample {
  private engine: WebGPUEngine;
  private settings: EngineSettings;

  constructor(element: HTMLElement | null, settings?: EngineSettings) {
    const canvas = document.createElement("canvas");

    invariant(element, "No html element provided as parent one to 'canvas' element");

    element.appendChild(canvas);
    element.style.overflow = "hidden";
    element.style.width = "100%";
    element.style.height = "100%";

    this.settings = settings ?? commonSettings;

    this.engine = new WebGPUEngine(canvas, this.settings);
  }

  async render(renderFunction: RenderFn) {
    invariant(renderFunction, "No render function provided");

    this.engine.render(async ({ device, context, width, height, font }) => {
      renderFunction({ device, context, width, height, font });
    });
  }
}

export default Sample;
