import Chart from "../../src/components/Chart.ts";
import { renderPass } from "../../src/renderers/baseRenderer.ts";
import createPipeline from "../../src/renderers/pipelines/line-strip.pipeline.ts";
import shaderCode from "./shader.wgsl?raw";
import makeVertexBuffer from "../../src/utils/makeVertexBuffer.ts";
import commonSettings from "../../src/common.settings.ts";

const chart = new Chart(document.getElementById("chart"), commonSettings);

chart.render(({ device, context, width, height }) => {
  renderPass(device, context, (passEncoder) => {
    const points = [0, 0, 50, 0, 50, 50, 0, 50, 0, 0];

    const pointsLineBuffer = makeVertexBuffer({
      vertices1DArray: points,
      device,
    });

    const pipeline = createPipeline({
      device,
      code: shaderCode,
      vertexState: {
        buffers: [
          {
            arrayStride: 8,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
            ],
            stepMode: "vertex",
          },
        ],
      },
      vertexConstants: {
        width: width,
        height: height,
        offset: 50,
      },
    });

    passEncoder.setPipeline(pipeline);

    passEncoder.setVertexBuffer(0, pointsLineBuffer);

    passEncoder.draw(points.length / 2);

    passEncoder.end();
  });
});
