import { hexToRGBA } from "./hexToRGBA";

export const validateHexColor = (hexColor: string): boolean =>
  /^(#)?([0-9A-F]{3,4}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(hexColor);

export const expandShortHexColor = (hexColor: string): string => {
  if (hexColor.length === 4 || hexColor.length === 5) {
    // includes '#' character
    return (
      "#" +
      hexColor
        .slice(1)
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  return hexColor;
};

const hexToGPUColorDict = (hexColorString: string): GPUColorDict => {
  const [r, g, b, a] = hexToRGBA(hexColorString);
  return { r, g, b, a };
};

export default hexToGPUColorDict;
