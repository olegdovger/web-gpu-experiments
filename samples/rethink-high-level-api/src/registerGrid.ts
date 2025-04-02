import registerLine from "./registerLine";

export default function registerGrid(
  size: number,
  options: { label?: string; color?: string; thickness?: number } = {},
  canvas: HTMLCanvasElement,
) {
  const { label = "Grid", color = "#FFFF00", thickness = 2 } = options;
  const width = canvas.width;
  const height = canvas.height;
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  // Register lines from center outward
  // Vertical lines
  for (let x = centerX; x <= width; x += size) {
    registerLine([x, 0], [x, height], { label, color, thickness });
  }
  for (let x = centerX - size; x >= 0; x -= size) {
    registerLine([x, 0], [x, height], { label, color, thickness });
  }

  // Horizontal lines
  for (let y = centerY; y <= height; y += size) {
    registerLine([0, y], [width, y], { label, color, thickness });
  }
  for (let y = centerY - size; y >= 0; y -= size) {
    registerLine([0, y], [width, y], { label, color, thickness });
  }
}
