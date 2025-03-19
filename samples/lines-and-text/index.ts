import commonSettings from "../../src/common.settings";
import { Vec2 } from "../../src/fonts/ttf/math/Vec2";
import { renderPass } from "../../src/renderers/baseRenderer";
import createLineListPipeline from "../../src/renderers/pipelines/line-list.pipeline";
import computeShaderCode from "./shader.compute.wgsl?raw";
import shaderCoordLineCode from "./shader-coord-line.wgsl?raw";
import makeVertexBuffer from "../../src/utils/makeVertexBuffer";
import hexToGPUColorDict from "../../src/utils/hexToGPUColorDict.ts";
import hexToGPUVec4f from "../../src/utils/hexToGPUVec4f.ts";
import Sample from "../../src/components/Sample.ts";

const sample = new Sample(document.getElementById("sample"), {
  ...commonSettings,
  fontSource: "/web-gpu-experiments/fonts/JetBrainsMono-Regular.ttf",
  // fontSource: "/web-gpu-experiments/fonts/Inter.ttf",
  // clearValue: hexToGPUColorDict("#B078C27C"),
  fontColorValue: hexToGPUColorDict("#a9a9a9"),
});

sample.render(async ({ device, context, font, width, height }) => {
  await renderPass(device, context, async () => {
    // 1. Compute data
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage",
          },
        },
      ],
    });

    const pipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: device.createShaderModule({ code: computeShaderCode }),
        entryPoint: "main",
      },
    });

    const BUFFER_SIZE = 4;

    const outputBuffer = device.createBuffer({
      size: BUFFER_SIZE * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 1,
          resource: {
            buffer: outputBuffer,
          },
        },
      ],
    });

    const computeCommandEncoder = device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();

    computePassEncoder.setPipeline(pipeline);
    computePassEncoder.setBindGroup(0, bindGroup);
    computePassEncoder.dispatchWorkgroups(Math.ceil((BUFFER_SIZE * 4) / 64));
    computePassEncoder.end();

    const stagingBuffer = device.createBuffer({
      size: BUFFER_SIZE * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    computeCommandEncoder.copyBufferToBuffer(
      outputBuffer,
      0, // Source offset
      stagingBuffer,
      0, // Destination offset
      BUFFER_SIZE * 4,
    );

    device.queue.submit([computeCommandEncoder.finish()]);

    // 2. Make copy of output data

    await stagingBuffer.mapAsync(
      GPUMapMode.READ,
      0, // Offset
      BUFFER_SIZE * 4, // Length
    );
    const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE * 4);
    const data = structuredClone(copyArrayBuffer);
    stagingBuffer.unmap();

    // 3. Render text

    const dataOutput = new Float32Array(data);

    const textPadding = 25;
    const fontSize = 14;

    dataOutput.forEach((item, index) => {
      const itemString = item.toString();

      font.text(itemString, new Vec2(textPadding, textPadding + fontSize * index), fontSize);
    });

    const textShape = font.text("Lorem Ipsum is simply dummy text of the printing a", new Vec2(100, 30), 16);

    font.render();

    const commandEncoder: GPUCommandEncoder = device.createCommandEncoder({
      label: "Base Renderer: command encoder",
    });

    const renderPassEncoder: GPURenderPassEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "load",
          storeOp: "store",
        },
      ],
    });

    const coordLineColor = hexToGPUVec4f("#CCEC57A5");

    const verticalCoordLine = [20, 5, ...coordLineColor, 20, height - 10, ...coordLineColor];
    const horizontalCoordLine = [5, 20, ...coordLineColor, width - 10, 20, ...coordLineColor];

    const verticalTicks = Array.from({ length: Math.floor((height - 20) / 40) })
      .fill(0)
      .map((_, index) => [
        15,
        40 * (index + 1),
        ...coordLineColor,
        20,
        40 * (index + 1),
        ...coordLineColor,
        12,
        40 * (index + 1) + 20,
        ...coordLineColor,
        20,
        40 * (index + 1) + 20,
        ...coordLineColor,
      ])
      .flat();

    const horizontalTicks = Array.from({
      length: Math.floor((width - 20) / 40),
    })
      .fill(0)
      .map((_, index) => [
        40 * (index + 1),
        15,
        ...coordLineColor,
        40 * (index + 1),
        20,
        ...coordLineColor,
        40 * (index + 1) + 20,
        12,
        ...coordLineColor,
        40 * (index + 1) + 20,
        20,
        ...coordLineColor,
      ])
      .flat();

    const textBoundsColor = hexToGPUVec4f("#fd6666");
    // textShape
    const textShapeBoundaryLines = [
      textShape.position.x,
      textShape.position.y,
      ...textBoundsColor,
      textShape.position.x + textShape.bounds.width,
      textShape.position.y,
      ...textBoundsColor,

      textShape.position.x,
      textShape.position.y + textShape.fontSize,
      ...textBoundsColor,
      textShape.position.x + textShape.bounds.width,
      textShape.position.y + textShape.fontSize,
      ...textBoundsColor,

      textShape.position.x,
      textShape.position.y,
      ...textBoundsColor,
      textShape.position.x,
      textShape.position.y + textShape.fontSize,
      ...textBoundsColor,

      textShape.position.x + textShape.bounds.width,
      textShape.position.y,
      ...textBoundsColor,
      textShape.position.x + textShape.bounds.width,
      textShape.position.y + textShape.fontSize,
      ...textBoundsColor,
    ];

    const coordLineData = [
      ...verticalCoordLine,
      ...horizontalCoordLine,
      ...verticalTicks,
      ...horizontalTicks,
      ...textShapeBoundaryLines,
    ];

    const coordLineBuffer = makeVertexBuffer({
      vertices1DArray: coordLineData,
      device,
    });

    const coordLinePipeline = createLineListPipeline({
      device,
      code: shaderCoordLineCode,
      vertexState: {
        buffers: [
          {
            arrayStride: 4 * (2 + 4),
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
              {
                shaderLocation: 1,
                offset: 4 * 2,
                format: "float32x4",
              },
            ],
            stepMode: "vertex",
          },
        ],
      },
      vertexConstants: {
        width: width,
        height: height,
        offset: 0,
      },
    });

    console.log('hexToGPUVec4f("#000000")', ...hexToGPUVec4f("#000000FF"));

    renderPassEncoder.setPipeline(coordLinePipeline);
    renderPassEncoder.setVertexBuffer(0, coordLineBuffer);
    renderPassEncoder.draw(coordLineData.length / (2 + 4));

    renderPassEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  });
});
