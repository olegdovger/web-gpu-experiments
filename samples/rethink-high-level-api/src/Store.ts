import { hexToRGBA } from "~/utils/hexToRGBA";

export const PRIMITIVE_TYPES = [
  "line",
  "point",
  "polyline",
  "triangle",
  "rectangle",
  "circle",
  "polygon",
  "grid",
] as const;
export type StorePrimitiveType = (typeof PRIMITIVE_TYPES)[number];

export interface StorePrimitive {
  id: string;
  type: StorePrimitiveType;
  data: Float32Array;
  visible: boolean;
  color: Float32Array;
  thickness?: number;
}

interface AddOptions {
  id?: string;
  type: StorePrimitiveType;
  data: number[];
  visible?: boolean;
  color?: string;
  thickness?: number;
}

type UpdateOptions = AddOptions & { id: string };

type PrimitiveCallback = () => void;

export class Store {
  private static instance: Store;

  private primitives: Map<string, StorePrimitive> = new Map();
  private primitivesByType: Map<StorePrimitiveType, Set<string>> = new Map();
  private dirtyPrimitives: Set<string> = new Set();
  private deletedPrimitives: Set<string> = new Set();

  private callbacks: PrimitiveCallback[] = [];

  constructor() {
    // Initialize primitive type maps
    Object.values(PRIMITIVE_TYPES).forEach((type) => {
      this.primitivesByType.set(type, new Set());
    });
  }

  public subscribe(callback: PrimitiveCallback) {
    this.callbacks.push(callback);
  }

  public unsubscribe(callback: PrimitiveCallback) {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  public publish() {
    this.callbacks.forEach((callback) => callback());
  }

  public add(options: AddOptions) {
    const { type, data, id: _id, visible = true, color: _color = "#000", thickness = 1 } = options;
    const id = _id || crypto.randomUUID();
    const color = new Float32Array(hexToRGBA(_color));

    const primitive: StorePrimitive = { id, type, data: new Float32Array(data), visible, color, thickness };

    this.primitives.set(id, primitive);
    this.primitivesByType.get(type)?.add(id);
    this.dirtyPrimitives.add(id);

    this.publish();

    return id;
  }

  public update(options: UpdateOptions) {
    const primitive = this.primitives.get(options.id);

    if (!primitive) {
      return false;
    }

    if (options.data) {
      primitive.data = new Float32Array(options.data);
    }

    if (options.color) {
      primitive.color = new Float32Array(hexToRGBA(options.color));
    }

    if (options.visible !== undefined) {
      primitive.visible = options.visible;
    }

    this.dirtyPrimitives.add(options.id);

    this.publish();

    return true;
  }

  public remove(id: string) {
    const primitive = this.primitives.get(id);

    if (!primitive) {
      return false;
    }

    this.primitivesByType.get(primitive.type)?.delete(id);
    this.primitives.delete(id);
    this.deletedPrimitives.add(id);
    this.dirtyPrimitives.delete(id);

    this.publish();

    return true;
  }

  public get(id: string): StorePrimitive | undefined {
    return this.primitives.get(id);
  }

  public getByType(type: StorePrimitiveType): StorePrimitive[] {
    const ids = this.primitivesByType.get(type) || new Set();
    const items = Array.from(ids).map((id) => this.primitives.get(id));
    const filteredItems = items.filter((item) => item !== undefined);

    return filteredItems;
  }

  public getVisible(): StorePrimitive[] {
    return Array.from(this.primitives.values()).filter((primitive) => primitive.visible);
  }

  public getDirty(): StorePrimitive[] {
    return Array.from(this.dirtyPrimitives)
      .map((id) => this.primitives.get(id))
      .filter((p): p is StorePrimitive => p !== undefined);
  }

  public getDeleted(): string[] {
    return Array.from(this.deletedPrimitives);
  }

  public clearChangeTracking() {
    this.dirtyPrimitives.clear();
    this.deletedPrimitives.clear();
  }

  public clearType(type: StorePrimitiveType) {
    const ids = this.primitivesByType.get(type) || new Set();
    for (const id of ids) {
      this.primitives.delete(id);
      this.deletedPrimitives.add(id);
    }
    this.primitivesByType.set(type, new Set());

    this.publish();
  }

  public clearAll() {
    Object.values(PRIMITIVE_TYPES).forEach((type) => {
      this.clearType(type);
    });
  }

  public debug(): Record<string, number | Record<string, number>> {
    const debug: Record<string, number | Record<string, number>> = {
      primitiveCount: this.primitives.size,
      byType: {},
      dirtyCount: this.dirtyPrimitives.size,
      deletedCount: this.deletedPrimitives.size,
    };

    for (const [type, ids] of this.primitivesByType.entries()) {
      const count = ids.size || 0;
      (debug.byType as Record<string, number>)[type] = count;
    }

    return debug;
  }
}
