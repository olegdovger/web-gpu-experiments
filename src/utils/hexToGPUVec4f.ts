import { hexToRGBA } from "./hexToRGBA";

const hexToGPUVec4f = (hexColorString: string): number[] => {
  return hexToRGBA(hexColorString);
};

export default hexToGPUVec4f;
