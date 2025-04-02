import { getCanvasElement } from "~/utils/getCanvasElement";
import { GeometryRenderer, geometryStore, geometryFactory } from "~/store";

// Example showing efficient handling of large datasets
export async function runLargeDataExample(canvas: HTMLCanvasElement) {
  // Get WebGPU setup
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

  // Create the renderer
  const renderer = new GeometryRenderer({
    device,
    context,
    format,
    canvas,
    multisampled: true,
  });

  // Performance measurement
  console.time("Large data generation");

  // Generate large dataset: 100,000 points for a scatter plot
  const POINT_COUNT = 100000;
  const points = new Float32Array(POINT_COUNT * 2);
  // Store original points for stable rotation
  const originalPoints = new Float32Array(POINT_COUNT * 2);

  // Fill with random points following a normal distribution pattern
  for (let i = 0; i < POINT_COUNT; i++) {
    // Use Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

    // Center in canvas with appropriate scale
    points[i * 2] = z1 * 100 + canvas.width / 2;
    points[i * 2 + 1] = z2 * 100 + canvas.height / 2;
    // Save original positions
    originalPoints[i * 2] = points[i * 2];
    originalPoints[i * 2 + 1] = points[i * 2 + 1];
  }

  // Add the points to the store using the batch method
  // This is much more efficient than adding individual points
  const pointBatchId = geometryFactory.createPointBatch(points, {
    color: [0.1, 0.4, 0.8, 0.5],
    size: 2,
    metadata: {
      description: "Large dataset scatter plot",
    },
  });

  console.timeEnd("Large data generation");

  // Generate 10,000 random lines
  console.time("Line generation");
  const LINE_COUNT = 15;
  const lines = new Float32Array(LINE_COUNT * 4); // x1,y1,x2,y2 per line

  for (let i = 0; i < LINE_COUNT; i++) {
    // Random line positions
    lines[i * 4] = Math.random() * canvas.width; // x1
    lines[i * 4 + 1] = Math.random() * canvas.height; // y1
    lines[i * 4 + 2] = Math.random() * canvas.width; // x2
    lines[i * 4 + 3] = Math.random() * canvas.height; // y2
  }

  // Add all lines as a single batch
  const lineBatchId = geometryFactory.createLineBatch(lines, {
    color: [0.9, 0.3, 0.1, 1], // Transparent red
    thickness: 1,
  });

  console.timeEnd("Line generation");

  // Memory usage statistics
  const memoryInfo = {
    pointsMemory: points.byteLength / (1024 * 1024), // MB
    linesMemory: lines.byteLength / (1024 * 1024), // MB
    totalPrimitives: 2, // 2 batches
    totalVertices: POINT_COUNT + LINE_COUNT * 2, // Points + line endpoints
  };

  console.log("Memory usage statistics:", memoryInfo);
  console.log("GeometryStore debug info:", geometryStore.debug());

  // User interaction: toggle visibility of datasets on click
  let pointsVisible = true;
  let linesVisible = true;

  canvas.addEventListener("click", () => {
    if (pointsVisible && linesVisible) {
      // Hide points
      geometryStore.update(pointBatchId, { visible: false });
      pointsVisible = false;
    } else if (!pointsVisible && linesVisible) {
      // Hide lines, show points
      geometryStore.update(pointBatchId, { visible: true });
      geometryStore.update(lineBatchId, { visible: false });
      pointsVisible = true;
      linesVisible = false;
    } else {
      // Show both
      geometryStore.update(lineBatchId, { visible: true });
      linesVisible = true;
    }
  });

  // Demo animation - slowly rotate all points around center
  let frame = 0;
  let totalRotation = 0;

  function animate() {
    frame++;

    // Only update every 10 frames to avoid excessive updates
    if (frame % 3 === 0 && pointsVisible) {
      console.time("Point rotation update");

      // Create a new data array for the updated positions
      const newPoints = new Float32Array(points.length);
      const centerX = 0;
      const centerY = 0;

      // Small rotation angle increment
      totalRotation += 0.01;

      // Apply rotation to each point from original positions
      for (let i = 0; i < POINT_COUNT; i++) {
        const x = originalPoints[i * 2];
        const y = originalPoints[i * 2 + 1];

        // Translate to origin, rotate by total angle, translate back
        const dx = x - centerX - 150;
        const dy = y - centerY - 150;

        newPoints[i * 2] = canvas.width / 2 + dx * Math.cos(totalRotation) - dy * Math.sin(totalRotation);
        newPoints[i * 2 + 1] = canvas.height / 2 + dx * Math.sin(totalRotation) + dy * Math.cos(totalRotation);
      }

      // Only update the data points - don't modify original array
      // This ensures we always rotate from the original positions
      geometryStore.update(pointBatchId, {
        data: newPoints,
        color: new Float32Array([0.3 + Math.abs(Math.cos(totalRotation * 5)), 0, 0, 1]),
      });

      console.timeEnd("Point rotation update");
    }

    requestAnimationFrame(animate);
  }

  // Start animation
  animate();

  // Use renderer to draw the scene
  function draw() {
    renderer.render();
    requestAnimationFrame(draw);
  }

  // Start drawing
  draw();
}

runLargeDataExample(getCanvasElement("sample"));
