import Sample from "../../src/components/Sample.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import commonSettings from "../../src/common.settings.ts";
import shaderCodePlain from "./shader.plain.wgsl?raw";

const sample = new Sample(document.getElementById("sample"), commonSettings);

sample.render(({ device, context }) => {
  renderPass(device, context, async (passEncoder) => {
    const pipeline = createPipeline({ device, code: shaderCodePlain });

    passEncoder.setPipeline(pipeline);
    passEncoder.draw(5);

    passEncoder.end();
  });
});
