import { getCanvasElement } from "~/utils/getCanvasElement";
import { assert } from "~/utils/assert";
import setupDevice from "~/utils/setupDevice";
import shaderCode from "./shader.wgsl?raw";

assert(navigator.gpu, "WebGPU is not supported");

const canvas = getCanvasElement("sample");
const { device, context, format } = await setupDevice(canvas);

context.configure({
  device,
  format,
  alphaMode: "premultiplied",
});

// Create uniform buffer for time and mouse position
const uniformBuffer = device.createBuffer({
  size: 12, // time (4) + mouseX (4) + mouseY (4)
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const pipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: {
    module: device.createShaderModule({ code: shaderCode }),
    entryPoint: "vertexMain",
  },
  fragment: {
    module: device.createShaderModule({ code: shaderCode }),
    entryPoint: "fragmentMain",
    targets: [{ format }],
  },
  primitive: {
    topology: "triangle-list",
  },
});

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) / canvas.width;
  mouseY = (e.clientY - rect.top) / canvas.height;
});

function render(time: number) {
  // Update uniform buffer with time and mouse position
  const uniformData = new Float32Array([
    time / 1000, // time
    mouseX, // mouseX
    mouseY, // mouseY
  ]);
  device.queue.writeBuffer(uniformBuffer, 0, uniformData);

  const commandEncoder = device.createCommandEncoder();
  const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(pipeline);
  renderPass.setBindGroup(
    0,
    device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    }),
  );
  renderPass.draw(6);
  renderPass.end();

  device.queue.submit([commandEncoder.finish()]);
  requestAnimationFrame(render);
}

requestAnimationFrame(render);
