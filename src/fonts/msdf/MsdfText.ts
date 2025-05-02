import { MsdfFont } from "./MsdfFont";
import { mat4, Mat4 } from "wgpu-matrix";
import { MsdfTextMeasurements } from "./types";

export class MsdfText {
  private bufferArray = new Float32Array(24);
  private bufferArrayDirty = true;

  constructor(
    public device: GPUDevice,
    private renderBundle: GPURenderBundle,
    public measurements: MsdfTextMeasurements,
    public font: MsdfFont,
    public textBuffer: GPUBuffer,
  ) {
    mat4.identity(this.bufferArray);
    this.setColor(1, 1, 1, 1);
    this.setPixelScale(1 / 512);
    this.bufferArrayDirty = true;
  }

  getRenderBundle() {
    if (this.bufferArrayDirty) {
      this.bufferArrayDirty = false;
      this.device.queue.writeBuffer(this.textBuffer, 0, this.bufferArray, 0, this.bufferArray.length);
    }
    return this.renderBundle;
  }

  setTransform(matrix: Mat4) {
    mat4.copy(matrix, this.bufferArray);
    this.bufferArrayDirty = true;
  }

  setColor(r: number, g: number, b: number, a: number = 1.0) {
    this.bufferArray[16] = r;
    this.bufferArray[17] = g;
    this.bufferArray[18] = b;
    this.bufferArray[19] = a;
    this.bufferArrayDirty = true;
  }

  setPixelScale(pixelScale: number) {
    this.bufferArray[20] = pixelScale;
    this.bufferArrayDirty = true;
  }
}
