import { Debuggable } from "../../render-line-of-certain-thickness/types";
import { setBufferStore } from "./initPlotState";
import transformColor from "./transformColor";

interface LineConfig extends Debuggable {
  thickness: number;
  color: string;
}

export default function registerLine(start: [number, number], end: [number, number], options: LineConfig) {
  const { label = "", color = "#000", thickness = 1 } = options;

  const colorDict = transformColor(color);

  const array = new Float32Array(start.length + end.length + 4 + 1);

  array.set([start[0], start[1], end[0], end[1]], 0);
  array.set([colorDict.r, colorDict.g, colorDict.b, colorDict.a], 4);
  array.set([thickness], 8);

  setBufferStore({
    lines: [
      {
        label,
        data: array,
      },
    ],
  });
}
