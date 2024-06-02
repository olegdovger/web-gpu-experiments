import Chart from "../../src/components/Chart.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import commonSettings from "../../src/common.settings.ts";
import shaderCodePlain from "./shader.plain.wgsl?raw";

const chart = new Chart(document.getElementById("chart"), commonSettings);

chart.render(({ device, context }) => {
  renderPass(device, context, async (passEncoder) => {
    const pipeline = createPipeline({ device, code: shaderCodePlain });

    passEncoder.setPipeline(pipeline);
    passEncoder.draw(5);

    passEncoder.end();
  });
});
