import { AlphaColor, BlueColor, GreenColor, RedColor } from "../types";
import { hexToRGBA } from "./hexToRGBA";

const hexToGPUVec4f = (hexColorString: string): [RedColor, GreenColor, BlueColor, AlphaColor] => {
  return hexToRGBA(hexColorString);
};

export default hexToGPUVec4f;
