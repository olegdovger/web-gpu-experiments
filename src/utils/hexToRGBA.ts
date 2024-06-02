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

export const hexToRGBA = (
  hexColor: string,
): [number, number, number, number] => {
  if (!validateHexColor(hexColor)) {
    throw new Error("Invalid hex color format");
  }

  const hex = expandShortHexColor(hexColor).replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

  return [r, g, b, a];
};
