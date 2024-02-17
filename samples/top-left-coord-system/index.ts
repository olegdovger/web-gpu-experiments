import Chart from "../../src/components/Chart.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import shaderCode from "./shader.wgsl?raw";
import shaderCoorfLineCode from "./shader-coord-line.wgsl?raw";
import makeVertexBufferAndLayout from "../../src/utils/makeVertexBufferAndLayout.ts";
import makeVertexBuffer from "../../src/utils/makeVertexBuffer.ts";
import commonSettings from "../common.settings.ts";

const chart = new Chart(document.getElementById("chart"), commonSettings);

chart.render(({device, context}) => {
  renderPass(device, context, (passEncoder) => {
    const points = [0.05, 0.05, 0.95, 0.05, 0.95, 0.95, 0.05, 0.05];

    const { buffer, layout: _layout } = makeVertexBufferAndLayout({
      vertices1DArray: points,
      device,
      shaderLocation: 0,
    });

    const pipeline = createPipeline({
      device,
      code: shaderCode,
      vertexState: {
        buffers: [_layout],
      },
    });

    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, buffer);
    passEncoder.draw(points.length / 2);

    const coordLine = [0.001, 0.999, 0.001, 0.001, 0.999, 0.001];

    const coordLineBuffer = makeVertexBuffer({
      vertices1DArray: coordLine,
      device,
    });

    const layout: GPUVertexBufferLayout = {
      arrayStride: 8,
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: "float32x2",
        },
      ],
      stepMode: "vertex",
    };

    const coordLinePipeline = createPipeline({
      device,
      code: shaderCoorfLineCode,
      vertexState: {
        buffers: [layout],
      },
    });

    passEncoder.setPipeline(coordLinePipeline);
    passEncoder.setVertexBuffer(0, coordLineBuffer);
    passEncoder.draw(coordLine.length / 2);

    passEncoder.end();
  });
});
