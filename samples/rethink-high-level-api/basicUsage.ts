import { geometryFactory, GeometryRenderer, geometryStore } from "~/store";
import { getCanvasElement } from "~/utils/getCanvasElement";
import { hexToRGBA } from "~/utils/hexToRGBA";

// Example WebGPU setup
async function setupWebGPU(canvas: HTMLCanvasElement) {
  if (!navigator.gpu) {
    throw new Error("WebGPU is not supported in this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });

  if (!adapter) {
    throw new Error("Failed to get GPU adapter.");
  }

  const device = await adapter.requestDevice();

  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format,
    alphaMode: "premultiplied",
  });

  return { device, context, format };
}

// Basic example showing usage of the geometry storage system
export async function runBasicExample(canvas: HTMLCanvasElement) {
  // Setup WebGPU
  const { device, context, format } = await setupWebGPU(canvas);

  // Create the renderer
  const renderer = new GeometryRenderer({
    device,
    context,
    format,
    canvas,
    multisampled: true,
  });

  // Create a grid
  const gridId = geometryFactory.createCenteredAxisGrid(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width,
    canvas.height,
    25,
    {
      color: hexToRGBA("#FF00ffAA"),
      thickness: 1,
    },
  );

  // Create some basic shapes
  const redPoint = geometryFactory.createPoint(100, 100, {
    color: [1, 0, 0, 1],
    size: 10,
  });

  const greenLine = geometryFactory.createLine(50, 50, 250, 200, {
    color: [0, 1, 0, 1],
    thickness: 3,
  });

  const blueTriangle = geometryFactory.createTriangle(300, 100, 400, 300, 200, 300, {
    color: [0, 0, 1, 0.5],
    filled: true,
  });

  const yellowCircle = geometryFactory.createCircle(400, 150, 75, {
    color: [1, 1, 0, 0.7],
    filled: true,
    segments: 32,
  });

  // Create a polyline
  geometryFactory.createPolyline([50, 400, 150, 450, 250, 375, 350, 425, 450, 350], {
    color: [1, 0, 1, 1],
    thickness: 2,
  });

  // Create batches of points for a scatter plot effect
  const pointCount = 100;
  const points = new Float32Array(pointCount * 2);

  for (let i = 0; i < pointCount; i++) {
    points[i * 2] = Math.random() * canvas.width;
    points[i * 2 + 1] = Math.random() * (canvas.height / 2);
  }

  geometryFactory.createPointBatch(points, {
    color: [0, 0.8, 0.8, 0.5],
    size: 3,
    metadata: {
      description: "Random scatter plot",
    },
  });

  // For animation example - manually trigger render in an animation loop
  let frame = 0;

  function animate() {
    frame++;

    // Update the circle position in a circular motion
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 100;
    const angle = frame * 0.01;
    const newCenterX = centerX + Math.cos(angle) * radius;
    const newCenterY = centerY + Math.sin(angle) * radius;

    // Generate new circle data (must recreate all points)
    const segments = 32; // Same as in original creation
    const data = new Float32Array(segments * 2 + 2);

    // Center point
    data[0] = newCenterX;
    data[1] = newCenterY;

    // Points around the circle
    for (let i = 0; i <= segments; i++) {
      const segmentAngle = (i / segments) * Math.PI * 2;
      const x = newCenterX + Math.cos(segmentAngle) * 75; // 75 is the circle radius
      const y = newCenterY + Math.sin(segmentAngle) * 75;
      data[(i + 1) * 2] = x;
      data[(i + 1) * 2 + 1] = y;
    }

    geometryStore.update(yellowCircle, { data });

    // The update above will automatically trigger a render via the callback
    // registered in the GeometryRenderer constructor

    requestAnimationFrame(animate);
  }

  // Start animdation
  animate();

  // Example of debugging
  console.log("Geometry Store Debug Info:", geometryStore.debug());

  // The renderer is already set up to automatically render when the store changes
  // We could also manually trigger a render:
  // renderer.render();
}

runBasicExample(getCanvasElement("sample"));
