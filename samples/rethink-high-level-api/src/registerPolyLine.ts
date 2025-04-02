import { Debuggable, LinePoint } from "../../render-line-of-certain-thickness/types";
import { setBufferStore } from "./initPlotState";
import transformColor from "./transformColor";

interface LineConfig extends Debuggable {
  thickness: number;
  color: string;
}

export default function registerPolyLine(data: LinePoint[], options: LineConfig) {
  const { label = "", color = "#000", thickness = 1 } = options;

  const colorDict = transformColor(color);

  const array = new Float32Array(data.length * 2 + 4 + 1);

  array.set(data.flat(1), 0);
  array.set([colorDict.r, colorDict.g, colorDict.b, colorDict.a], data.length * 2);
  array.set([thickness], data.length * 2 + 4);

  setBufferStore({
    polylines: [{ label, data: array }],
  });
}
