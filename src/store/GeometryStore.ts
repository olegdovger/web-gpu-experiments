/**
 * GeometryPrimitiveType defines the types of geometric primitives supported
 */
export enum GeometryPrimitiveType {
  POINT = "point",
  LINE = "line",
  POLYLINE = "polyline",
  TRIANGLE = "triangle",
  RECTANGLE = "rectangle",
  CIRCLE = "circle",
  POLYGON = "polygon",
  GRID = "grid",
}

/**
 * Interface defining metadata structure for geometry primitives
 */
export interface GeometryMetadata {
  description?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Interface defining common properties for all geometry primitives
 */
export interface GeometryPrimitive {
  id: string;
  type: GeometryPrimitiveType;
  visible: boolean;
  data: Float32Array;
  color?: Float32Array; // RGBA color values
  metadata?: GeometryMetadata;
}

/**
 * Type guard to check if an object is a GeometryPrimitive
 */
export function isGeometryPrimitive(obj: unknown): obj is GeometryPrimitive {
  if (!obj || typeof obj !== "object") return false;

  const primitive = obj as Partial<GeometryPrimitive>;
  return (
    typeof primitive.id === "string" &&
    typeof primitive.type === "string" &&
    Object.values(GeometryPrimitiveType).includes(primitive.type as GeometryPrimitiveType) &&
    typeof primitive.visible === "boolean" &&
    primitive.data instanceof Float32Array
  );
}

/**
 * GeometryStore manages the storage and lifecycle of geometric primitives
 * for WebGPU rendering, optimizing memory usage for large datasets
 */
export class GeometryStore {
  private static instance: GeometryStore;
  private primitives: Map<string, GeometryPrimitive> = new Map();
  private primitivesByType: Map<GeometryPrimitiveType, Set<string>> = new Map();
  private dirtyPrimitives: Set<string> = new Set();
  private deletedPrimitives: Set<string> = new Set();
  private renderCallback: (() => void) | null = null;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize primitive type maps
    Object.values(GeometryPrimitiveType).forEach((type) => {
      this.primitivesByType.set(type, new Set());
    });
  }

  /**
   * Get the singleton instance of GeometryStore
   */
  public static getInstance(): GeometryStore {
    return (GeometryStore.instance = GeometryStore.instance || new GeometryStore());
  }

  /**
   * Set a callback function to trigger rendering when store data changes
   */
  public setRenderCallback(callback: () => void): void {
    this.renderCallback = callback;
  }

  /**
   * Trigger the render callback if set
   */
  private triggerRender(): void {
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  /**
   * Add a new geometry primitive to the store
   */
  public add(
    type: GeometryPrimitiveType,
    data: Float32Array,
    options: {
      id?: string;
      color?: Float32Array;
      visible?: boolean;
      metadata?: GeometryMetadata;
    } = {},
  ): string {
    const id = options.id || crypto.randomUUID();

    const primitive: GeometryPrimitive = {
      id,
      type,
      data,
      visible: options.visible !== undefined ? options.visible : true,
      color: options.color,
      metadata: options.metadata,
    };

    this.primitives.set(id, primitive);
    this.primitivesByType.get(type)?.add(id);
    this.dirtyPrimitives.add(id);

    this.triggerRender();

    return id;
  }

  /**
   * Update an existing geometry primitive
   */
  public update(
    id: string,
    updates: {
      data?: Float32Array;
      color?: Float32Array;
      visible?: boolean;
      metadata?: GeometryMetadata;
    },
  ): boolean {
    const primitive = this.primitives.get(id);

    if (!primitive) {
      return false;
    }

    if (updates.data) {
      primitive.data = updates.data;
    }

    if (updates.color) {
      primitive.color = updates.color;
    }

    if (updates.visible !== undefined) {
      primitive.visible = updates.visible;
    }

    if (updates.metadata) {
      primitive.metadata = {
        ...primitive.metadata,
        ...updates.metadata,
      };
    }

    this.dirtyPrimitives.add(id);
    this.triggerRender();

    return true;
  }

  /**
   * Remove a geometry primitive from the store
   */
  public remove(id: string): boolean {
    const primitive = this.primitives.get(id);

    if (!primitive) {
      return false;
    }

    this.primitivesByType.get(primitive.type)?.delete(id);
    this.primitives.delete(id);
    this.deletedPrimitives.add(id);
    this.dirtyPrimitives.delete(id);

    this.triggerRender();

    return true;
  }

  /**
   * Get a specific geometry primitive by id
   */
  public get(id: string): GeometryPrimitive | undefined {
    return this.primitives.get(id);
  }

  /**
   * Get all geometry primitives of a specific type
   */
  public getByType(type: GeometryPrimitiveType): GeometryPrimitive[] {
    const ids = this.primitivesByType.get(type) || new Set();
    return Array.from(ids)
      .map((id) => this.primitives.get(id))
      .filter(isGeometryPrimitive);
  }

  /**
   * Get all visible geometry primitives
   */
  public getVisible(): GeometryPrimitive[] {
    return Array.from(this.primitives.values()).filter((primitive) => primitive.visible);
  }

  /**
   * Get dirty (modified) primitives that need re-rendering
   */
  public getDirty(): GeometryPrimitive[] {
    return Array.from(this.dirtyPrimitives)
      .map((id) => this.primitives.get(id))
      .filter(isGeometryPrimitive);
  }

  /**
   * Get IDs of primitives that were deleted
   */
  public getDeleted(): string[] {
    return Array.from(this.deletedPrimitives);
  }

  /**
   * Clear the dirty and deleted tracking lists after rendering
   */
  public clearChangeTracking(): void {
    this.dirtyPrimitives.clear();
    this.deletedPrimitives.clear();
  }

  /**
   * Clear all primitives of a specific type
   */
  public clearType(type: GeometryPrimitiveType): void {
    const ids = this.primitivesByType.get(type) || new Set();

    ids.forEach((id) => {
      this.primitives.delete(id);
      this.deletedPrimitives.add(id);
    });

    this.primitivesByType.set(type, new Set());
    this.triggerRender();
  }

  /**
   * Clear all primitives in the store
   */
  public clearAll(): void {
    Object.values(GeometryPrimitiveType).forEach((type) => {
      this.clearType(type);
    });
  }

  /**
   * Convert store data to a structure that can be printed/logged
   */
  public debug(): Record<string, number | Record<string, number>> {
    const debug: Record<string, number | Record<string, number>> = {
      primitiveCount: this.primitives.size,
      byType: {},
      dirtyCount: this.dirtyPrimitives.size,
      deletedCount: this.deletedPrimitives.size,
    };

    Object.values(GeometryPrimitiveType).forEach((type) => {
      const count = this.primitivesByType.get(type)?.size || 0;
      (debug.byType as Record<string, number>)[type] = count;
    });

    return debug;
  }
}
