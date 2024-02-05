import Chart from "../../src/components/Chart.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import shaderCodePlain from "./shader.plain.wgsl?raw";

const chat = new Chart(document.getElementById("chart"), {
  debug: true,
  log: true,
});

chat.render((device, context) => {
  renderPass(device, context, (passEncoder) => {
    const pipeline = createPipeline({ device, code: shaderCodePlain });

    passEncoder.setPipeline(pipeline);
    passEncoder.draw(5);

    passEncoder.end();
  });
});
