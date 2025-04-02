import { Plot } from "./initPlot";
import { getBufferStore } from "./initPlotState";
import computePointsShaderCode from "../compute.line.points.wgsl?raw";
import linesShaderCode from "../lines.wgsl?raw";

export default function drawLines({
  device,
  context,
  renderPass,
}: Plot["internal"] & { commandEncoder: GPUCommandEncoder; renderPass: GPURenderPassEncoder }) {
  const bufferStore = getBufferStore();
  const lines = bufferStore.lines;

  if (!lines) return;

  const canvasTexture = context.getCurrentTexture();

  lines.forEach((line) => {
    const points = line.data.subarray(0, -5);
    const color = line.data.subarray(points.length, -1);
    const thickness = line.data.at(-1) ?? 1;

    const pointsBuffer = device.createBuffer({
      size: points.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(pointsBuffer, 0, points);

    const verticesBuffer = device.createBuffer({
      size: 4 * (pointsBuffer.size - 4 * 2),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const computePipeline = device.createComputePipeline({
      layout: "auto",
      compute: {
        module: device.createShaderModule({ code: computePointsShaderCode }),
        entryPoint: "main",
        constants: {
          thickness: thickness,
        },
      },
    });

    const bindComputePointsGroup = device.createBindGroup({
      layout: computePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: pointsBuffer } },
        { binding: 1, resource: { buffer: verticesBuffer } },
      ],
    });

    const computeCommandEncoder = device.createCommandEncoder({
      label: "Command compute encoder",
    });

    const computePass = computeCommandEncoder.beginComputePass();
    computePass.setPipeline(computePipeline);
    computePass.setBindGroup(0, bindComputePointsGroup);
    computePass.dispatchWorkgroups(Math.ceil(points.length / 2 / 64));
    computePass.end();

    device.queue.submit([computeCommandEncoder.finish()]);

    const resolutionBuffer = device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(resolutionBuffer, 0, new Float32Array([canvasTexture.width, canvasTexture.height]));

    const colorBuffer = device.createBuffer({
      size: 4 * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(colorBuffer, 0, color);

    const module = device.createShaderModule({
      label: "lines shader",
      code: linesShaderCode,
    });

    const renderPipeline = device.createRenderPipeline({
      label: "Render pipeline",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs",
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format: "bgra8unorm",
            blend: {
              color: {
                operation: "add",
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
              alpha: {
                operation: "add",
                srcFactor: "zero",
                dstFactor: "zero",
              },
            },
          },
        ],
      },
      multisample: {
        count: 4,
      },
      primitive: {
        topology: thickness > 1 ? "triangle-strip" : "line-strip",
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "always",
        format: "depth24plus",
      },
    });

    renderPass.setPipeline(renderPipeline);

    const bindRenderLinesGroup = device.createBindGroup({
      layout: renderPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: resolutionBuffer } },
        { binding: 1, resource: { buffer: verticesBuffer } },
        { binding: 2, resource: { buffer: colorBuffer } },
      ],
    });

    renderPass.setBindGroup(0, bindRenderLinesGroup);
    renderPass.draw(pointsBuffer.size / 2 - 4);
  });
}
