# WebGPU Geometry Storage System

This module provides an efficient state storage system for managing geometric primitives for WebGPU rendering.

## Architecture

The storage system consists of three main components:

1. **GeometryStore**: Core storage system that manages primitives with change tracking and memory optimization
2. **GeometryRenderer**: Handles WebGPU rendering operations for the stored primitives
3. **GeometryFactory**: Utility factory for easily creating common geometric primitives

## Features

- Efficient memory usage with typed arrays (Float32Array)
- Optimized for large data volumes
- Change tracking to minimize GPU updates
- CRUD operations for geometry data (Create, Read, Update, Delete)
- Automatic re-rendering on data changes
- Memory management for WebGPU buffers
- Batching similar operations for performance
- Singleton pattern for easy global access
- Debugging capabilities for inspecting data

## Usage Examples

### Basic Setup

```typescript
import { GeometryRenderer, geometryStore, geometryFactory } from "./store";

// Initialize the renderer with the WebGPU device and canvas context
const renderer = new GeometryRenderer({
  device,
  context,
  format,
  canvas,
});

// The rendering system will automatically respond to changes in the store
```

### Creating Primitives

```typescript
// Create various geometric primitives
const pointId = geometryFactory.createPoint(100, 100, {
  color: [1, 0, 0, 1], // Red
  size: 5,
});

const lineId = geometryFactory.createLine(50, 50, 250, 150, {
  color: [0, 1, 0, 1], // Green
  thickness: 2,
});

// Create from arrays of points
const polylineId = geometryFactory.createPolyline([100, 100, 200, 50, 300, 150, 400, 75], {
  color: [0, 0, 1, 1], // Blue
  thickness: 3,
  closed: true,
});
```

### Updating Primitives

```typescript
// Update a previously created primitive
geometryStore.update(pointId, {
  // Move the point
  data: new Float32Array([150, 150]),
  // Change color to yellow
  color: new Float32Array([1, 1, 0, 1]),
});
```

### Removing Primitives

```typescript
// Remove a primitive
geometryStore.remove(lineId);

// Clear all primitives of a specific type
geometryStore.clearType(GeometryPrimitiveType.POINT);

// Clear everything
geometryStore.clearAll();
```

### Manual Rendering

```typescript
// Rendering happens automatically when data changes,
// but you can also trigger it manually:
renderer.render();
```

### Debugging

```typescript
// Get statistics and counts
console.log(geometryStore.debug());
```

## Memory Optimization

The system optimizes memory usage through:

1. **Typed Arrays**: Using `Float32Array` for all geometry data
2. **Buffer Caching**: Reusing WebGPU buffers when data hasn't changed
3. **Change Tracking**: Only updating data that has changed
4. **Efficient Data Storage**: Compact representation of primitives
5. **Batching**: Supporting batch operations for points, lines, etc.

## Performance Tips

- Use `createPointBatch()` and `createLineBatch()` for large datasets rather than creating individual primitives
- Minimize updates to frequently changing data
- Group similar primitives together (by type) for better rendering performance
- Use the visibility flag instead of removing/adding primitives that toggle frequently
