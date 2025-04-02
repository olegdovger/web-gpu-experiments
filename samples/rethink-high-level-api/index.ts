import { getCanvasElement } from "~/utils/getCanvasElement";
import { invariant } from "~/utils/invariant.ts";
import { Renderer } from "./src/Renderer";
import { Store } from "./src/Store";

invariant(navigator.gpu, "WebGPU is not supported");

const canvas = getCanvasElement("sample");

// Initialize the renderer with a single device
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const renderer = await Renderer.init(canvas, {
  multisampled: true,
  depthFormat: "depth24plus",
  clearColor: { r: 0.15, g: 0.15, b: 0.15, a: 1.0 },
});

// Create a simple polyline example
const store = renderer.getStore();

// Create a polyline with 5 points in a zigzag pattern
const polylineData = [50, 50, 450, 50, 450, 450, 50, 450, 50, 50];
const polylineData2 = polylineData.map((value) => value + 50);

// Register the polyline with the store
store.add({
  type: "polyline",
  data: polylineData,
  color: "#00FF00",
  thickness: 5,
});

// Register the polyline with the store
store.add({
  type: "polyline",
  data: polylineData2,
  color: "#FF0000",
  thickness: 5,
});
