import { VertexBufferOutput } from "../../utils/makeVertexBufferAndLayout.ts";

interface PipelineLayoutProps {
  device: GPUDevice;
  code: GPUShaderModuleDescriptor["code"];
  vertexState?: {
    buffers: VertexBufferOutput["layout"][];
  };
  vertexConstants?: GPUProgrammableStage["constants"];
}

export default function createPipeline({
  device,
  code,
  vertexState,
  vertexConstants,
}: PipelineLayoutProps): GPURenderPipeline {
  const pipeline: GPURenderPipeline = device.createRenderPipeline({
    layout: "auto",
    primitive: {
      topology: "line-strip",
    },
    vertex: {
      module: device.createShaderModule({ code: code }),
      entryPoint: "main_vertex",
      buffers: vertexState?.buffers,
      constants: vertexConstants,
    },
    fragment: {
      module: device.createShaderModule({ code: code }),
      entryPoint: "main_fragment",
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
          // blend: {
          //   color: {
          //     srcFactor: "src-alpha",
          //     dstFactor: "one-minus-src-alpha",
          //     operation: "add",
          //   },
          //   alpha: {
          //     srcFactor: "one",
          //     dstFactor: "zero",
          //     operation: "add",
          //   }
          // },
        },
      ],
    },
  });

  return pipeline;
}
