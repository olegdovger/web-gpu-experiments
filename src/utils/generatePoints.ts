import { GeneratePointsProps } from "../../samples/render-line-of-certain-thickness/types.ts";

export default function generatePoints(props: GeneratePointsProps): Float32Array {
  const { maxCount, minX, maxX, minY, maxY } = props;

  const points = new Float32Array((maxCount + 1) * 2);
  const step = (maxX - minX) / maxCount;

  for (let i = 0; i <= maxCount; i += 1) {
    points[2 * i] = minX + i * step;
    points[2 * i + 1] = minY + Math.random() * (maxY - minY);
  }

  return points;
}
