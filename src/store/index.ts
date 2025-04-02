// Export all components from the geometry store system
export * from "./GeometryStore";
export * from "./GeometryRenderer";
export * from "./GeometryFactory";

// Export convenience singleton instances
import { GeometryStore } from "./GeometryStore";
import { GeometryFactory } from "./GeometryFactory";

// Pre-instantiated singleton instances for easy import
export const geometryStore = GeometryStore.getInstance();
export const geometryFactory = new GeometryFactory();
