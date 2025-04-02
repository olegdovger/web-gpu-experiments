import { GeometryStore, GeometryPrimitiveType } from "./GeometryStore";

/**
 * GeometryFactory provides utility methods to easily create
 * common geometric primitives and add them to the store
 */
export class GeometryFactory {
  private store: GeometryStore;

  constructor() {
    this.store = GeometryStore.getInstance();
  }

  /**
   * Create a point
   */
  public createPoint(
    x: number,
    y: number,
    options: {
      color?: [number, number, number, number];
      size?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    const data = new Float32Array([x, y]);

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.POINT, data, {
      color,
      metadata: {
        size: options.size || 1,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a line between two points
   */
  public createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options: {
      color?: [number, number, number, number];
      thickness?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    const data = new Float32Array([x1, y1, x2, y2]);

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.LINE, data, {
      color,
      metadata: {
        thickness: options.thickness || 1,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a polyline from an array of points
   */
  public createPolyline(
    points: number[] | Float32Array,
    options: {
      color?: [number, number, number, number];
      thickness?: number;
      closed?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    let data: Float32Array;

    if (points instanceof Float32Array) {
      data = points;
    } else {
      data = new Float32Array(points);
    }

    // Ensure we have even number of coordinates
    if (data.length % 2 !== 0) {
      throw new Error("Polyline points must contain even number of coordinates (x,y pairs)");
    }

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.POLYLINE, data, {
      color,
      metadata: {
        thickness: options.thickness || 1,
        closed: options.closed || false,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a triangle
   */
  public createTriangle(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    options: {
      color?: [number, number, number, number];
      filled?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    const data = new Float32Array([x1, y1, x2, y2, x3, y3]);

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.TRIANGLE, data, {
      color,
      metadata: {
        filled: options.filled !== undefined ? options.filled : true,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a rectangle from top-left corner and dimensions
   */
  public createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    options: {
      color?: [number, number, number, number];
      filled?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    // Define the four corners of the rectangle
    const data = new Float32Array([
      x,
      y, // Top-left
      x + width,
      y, // Top-right
      x + width,
      y + height, // Bottom-right
      x,
      y + height, // Bottom-left
    ]);

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.RECTANGLE, data, {
      color,
      metadata: {
        filled: options.filled !== undefined ? options.filled : true,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a circle from center point and radius
   */
  public createCircle(
    centerX: number,
    centerY: number,
    radius: number,
    options: {
      color?: [number, number, number, number];
      filled?: boolean;
      segments?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    const segments = options.segments || 32;
    const data = new Float32Array(segments * 2 + 2); // +2 for center point

    // Store center point at the beginning if filled
    data[0] = centerX;
    data[1] = centerY;

    // Calculate points around the circle
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      data[(i + 1) * 2] = x;
      data[(i + 1) * 2 + 1] = y;
    }

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.CIRCLE, data, {
      color,
      metadata: {
        radius,
        filled: options.filled !== undefined ? options.filled : true,
        segments,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a polygon from an array of points
   */
  public createPolygon(
    points: number[] | Float32Array,
    options: {
      color?: [number, number, number, number];
      filled?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    let data: Float32Array;

    if (points instanceof Float32Array) {
      data = points;
    } else {
      data = new Float32Array(points);
    }

    // Ensure we have even number of coordinates
    if (data.length % 2 !== 0) {
      throw new Error("Polygon points must contain even number of coordinates (x,y pairs)");
    }

    // Ensure polygon has at least 3 points
    if (data.length < 6) {
      throw new Error("Polygon must have at least 3 points");
    }

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.POLYGON, data, {
      color,
      metadata: {
        filled: options.filled !== undefined ? options.filled : true,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a grid within the specified bounds
   */
  public createGrid(
    x: number,
    y: number,
    width: number,
    height: number,
    cellSize: number,
    options: {
      color?: [number, number, number, number];
      thickness?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    const horizontalLines = Math.floor(height / cellSize) + 1;
    const verticalLines = Math.floor(width / cellSize) + 1;
    const totalLines = horizontalLines + verticalLines;
    const data = new Float32Array(totalLines * 4); // 2 points per line, 2 coordinates per point

    let offset = 0;

    // Horizontal lines
    for (let i = 0; i <= horizontalLines; i++) {
      const y1 = y + i * cellSize;
      data[offset++] = x;
      data[offset++] = y1;
      data[offset++] = x + width;
      data[offset++] = y1;
    }

    // Vertical lines
    for (let i = 0; i <= verticalLines; i++) {
      const x1 = x + i * cellSize;
      data[offset++] = x1;
      data[offset++] = y;
      data[offset++] = x1;
      data[offset++] = y + height;
    }

    const color = options.color ? new Float32Array(options.color) : new Float32Array([0.7, 0.7, 0.7, 1]);

    return this.store.add(GeometryPrimitiveType.GRID, data, {
      color,
      metadata: {
        cellSize,
        thickness: options.thickness || 1,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a grid centered around a point
   */
  public createCenteredGrid(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    cellSize: number,
    options: {
      color?: [number, number, number, number];
      thickness?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    const x = centerX - width / 2;
    const y = centerY - height / 2;
    return this.createGrid(x, y, width, height, cellSize, options);
  }

  /**
   * Create a grid with colored center axes
   */
  public createCenteredAxisGrid(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    cellSize: number,
    options: {
      color?: [number, number, number, number];
      thickness?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    // Create regular grid with grey color
    const gridId = this.createGrid(centerX - width / 2, centerY - height / 2, width, height, cellSize, {
      ...options,
      color: options.color || [0.7, 0.7, 0.7, 1],
    });

    // Create vertical center line in red
    this.createLine(centerX, centerY - height / 2, centerX, centerY + height / 2, {
      ...options,
      color: [1, 0, 0, 1],
      thickness: options.thickness || 1,
    });

    // Create horizontal center line in red
    this.createLine(centerX - width / 2, centerY, centerX + width / 2, centerY, {
      ...options,
      color: [1, 0, 0, 1],
      thickness: options.thickness || 1,
    });

    return gridId;
  }

  /**
   * Create a batch of points from an array
   */
  public createPointBatch(
    points: number[] | Float32Array,
    options: {
      color?: [number, number, number, number];
      size?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    let data: Float32Array;

    if (points instanceof Float32Array) {
      data = points;
    } else {
      data = new Float32Array(points);
    }

    // Ensure we have even number of coordinates
    if (data.length % 2 !== 0) {
      throw new Error("Point batch must contain even number of coordinates (x,y pairs)");
    }

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.POINT, data, {
      color,
      metadata: {
        size: options.size || 1,
        isBatch: true,
        ...options.metadata,
      },
    });
  }

  /**
   * Create a batch of lines from an array (every pair of points forms a line)
   */
  public createLineBatch(
    lines: number[] | Float32Array,
    options: {
      color?: [number, number, number, number];
      thickness?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): string {
    let data: Float32Array;

    if (lines instanceof Float32Array) {
      data = lines;
    } else {
      data = new Float32Array(lines);
    }

    // Ensure we have even number of coordinates
    if (data.length % 4 !== 0) {
      throw new Error("Line batch must contain multiple of 4 coordinates (x1,y1,x2,y2 per line)");
    }

    const color = options.color ? new Float32Array(options.color) : new Float32Array([1, 1, 1, 1]);

    return this.store.add(GeometryPrimitiveType.LINE, data, {
      color,
      metadata: {
        thickness: options.thickness || 1,
        isBatch: true,
        ...options.metadata,
      },
    });
  }
}
