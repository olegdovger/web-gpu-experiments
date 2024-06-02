import Chart from "../../src/components/Chart.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import shaderCodeWithInputPoints from "./shader.input.points.wgsl?raw";
import makeVertexBufferAndLayout from "../../src/utils/makeVertexBufferAndLayout.ts";
import commonSettings from "../../src/common.settings.ts";

const chart = new Chart(document.getElementById("chart"), commonSettings);

chart.render(({ device, context }) => {
  renderPass(device, context, async (passEncoder) => {
    const points = [
      0.0, 0.95, 0.587785, 0.809017, 0.951057, 0.309017, 0.951057, -0.309017,
      0.587785, -0.809017, 0.0, -0.95, -0.587785, -0.809017, -0.951057,
      -0.309017, -0.951057, 0.309017, -0.587785, 0.809017, 0.0, 0.95,
    ];

    const { buffer, layout } = makeVertexBufferAndLayout({
      vertices1DArray: points,
      device,
      shaderLocation: 0,
    });

    const pipeline = createPipeline({
      device,
      code: shaderCodeWithInputPoints,
      vertexState: {
        buffers: [layout],
      },
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, buffer);
    passEncoder.draw(points.length / 2);

    passEncoder.end();
  });
});
