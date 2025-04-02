export interface GeneratePointsProps {
  maxCount: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export type LinePoint = [number, number];

export interface Debuggable {
  label?: string;
}
