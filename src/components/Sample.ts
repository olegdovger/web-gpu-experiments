import commonSettings from "../common.settings.ts";
import { assert } from "../utils/assert.ts";
import WebGPUEngine, { EngineSettings, RenderFn } from "./WebGPUEngine.ts";

class Sample {
  private engine: WebGPUEngine;
  private settings: EngineSettings;

  constructor(element: HTMLElement | null, settings?: EngineSettings) {
    const parentElement = document.createElement("div");
    const canvas = document.createElement("canvas");

    assert(element, "No html element provided as parent one to 'canvas' element");

    element.appendChild(parentElement);
    parentElement.appendChild(canvas);
    parentElement.style.overflow = "hidden";
    parentElement.style.width = element.getBoundingClientRect().width + "px";
    parentElement.style.height = element.getBoundingClientRect().height + "px";

    this.settings = settings ?? commonSettings;

    this.engine = new WebGPUEngine(canvas, this.settings);
  }

  async render(renderFunction: RenderFn) {
    assert(renderFunction, "No render function provided");

    this.engine.render(async ({ device, context, width, height, font }) => {
      renderFunction({ device, context, width, height, font });
    });
  }
}

export default Sample;
