import type {Block} from "./types.ts";

class LayoutManager {
  private blocks: Block[];
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.blocks = [];
    this.width = canvas.width;
    this.height = canvas.height;
  }

  render() {
    const width = this.width;
    const height = this.height;

    console.debug('Rendering', this.blocks.length, 'blocks');
    console.debug('Width:', width, ', height:', height);

    for (let i = 0; i < this.blocks.length; i++) {

    }
  }
}

export default LayoutManager;