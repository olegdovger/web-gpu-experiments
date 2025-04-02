import hexToGPUColorDict from "~/utils/hexToGPUColorDict";

export default function transformColor(color: string): GPUColorDict {
  return hexToGPUColorDict(color);
}
