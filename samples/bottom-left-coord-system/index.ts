import Sample from "../../src/components/Sample.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import shaderCode from "./shader.wgsl?raw";
import shaderCoordLineCode from "./shader-coord-line.wgsl?raw";
import makeVertexBufferAndLayout from "../../src/utils/makeVertexBufferAndLayout.ts";
import commonSettings from "../../src/common.settings.ts";

const sample = new Sample(document.getElementById("sample"), commonSettings);

sample.render(({ device, context }) => {
  renderPass(device, context, async (passEncoder) => {
    const points = [0.05, 0.05, 0.95, 0.05, 0.95, 0.95, 0.05, 0.05];

    const { buffer, layout } = makeVertexBufferAndLayout({
      vertices1DArray: points,
      device,
      shaderLocation: 0,
    });

    const pipeline = createPipeline({
      device,
      code: shaderCode,
      vertexState: {
        buffers: [layout],
      },
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, buffer);
    passEncoder.draw(points.length / 2);

    const coordLine = [0.001, 0.999, 0.001, 0.001, 0.999, 0.001];

    const { buffer: coordLineBuffer, layout: coordLineLayout } = makeVertexBufferAndLayout({
      vertices1DArray: coordLine,
      device,
      shaderLocation: 0,
    });

    const coordLinePipeline = createPipeline({
      device,
      code: shaderCoordLineCode,
      vertexState: {
        buffers: [coordLineLayout],
      },
    });

    passEncoder.setPipeline(coordLinePipeline);
    passEncoder.setVertexBuffer(0, coordLineBuffer);
    passEncoder.draw(coordLine.length / 2);

    passEncoder.end();
  });
});
