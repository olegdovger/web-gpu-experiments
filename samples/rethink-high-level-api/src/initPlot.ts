import setupDevice from "~/utils/setupDevice";
import registerPolyLine from "./registerPolyLine";
import { initBufferStore } from "./initPlotState";
import draw from "./draw";
import registerGrid from "./registerGrid";
import registerLine from "./registerLine";

// type CreateCircle = ({ center, radius, color }: { center: Point, radius: number, color: string }) => void;
// type CreateRectangle = ({ topLeft, width, height, color }: { topLeft: Point, width: number, height: number, color: string }) => void;

export interface Plot {
  internal: {
    device: GPUDevice;
    format: GPUTextureFormat;
    context: GPUCanvasContext;
    canvas: HTMLCanvasElement;
  };
  api: {
    draw: () => void;
    registerPolyLine: typeof registerPolyLine;
    registerGrid: (size: number, options: { label?: string; color?: string; thickness?: number }) => void;
    registerLine: typeof registerLine;
    // createCircle: CreateCircle;
    // createRectangle: CreateRectangle;
  };
}

export default async function initPlot(canvas: HTMLCanvasElement): Promise<Plot> {
  initBufferStore();

  const { device, format, context } = await setupDevice(canvas);

  context.configure({
    device,
    format,
  });

  return {
    internal: {
      device,
      format,
      context,
      canvas,
    },
    api: {
      draw: () => {
        draw({
          device,
          format,
          context,
          canvas,
        });
      },
      registerPolyLine: registerPolyLine,
      registerLine: registerLine,
      registerGrid: (size: number, options: { label?: string; color?: string; thickness?: number }) => {
        registerGrid(size, options, canvas);
      },
    },
  };
}
