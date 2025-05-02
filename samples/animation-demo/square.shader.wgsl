struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f
}

@group(0) @binding(0)
var<uniform> resolution: vec2f;

@group(0) @binding(1)
var<uniform> squareCenter: vec2f;

@group(0) @binding(2)
var<uniform> squareSize: vec2f;

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2f, 6>(vec2f(- 1, - 1), vec2f(1, - 1), vec2f(- 1, 1), vec2f(1, - 1), vec2f(1, 1), vec2f(- 1, 1),);

  var output: VertexOutput;
  output.position = vec4f(pos[vertexIndex], 0, 1);
  output.uv = pos[vertexIndex] * 0.5 + 0.5;

  return output;
}

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Convert UV to pixel coordinates
  let pixelPos = uv * resolution;

  // Square size in pixels
  let squareSize = squareSize;

  // Calculate distance from center in pixels
  let dist = abs(pixelPos - squareCenter) - squareSize * .5;

  // Convert back to normalized coordinates for fwidth
  let normalizedDist = max(dist.x / resolution.x, dist.y / resolution.y);

  // Use fwidth for anti-aliasing
  let edgeWidth = fwidth(normalizedDist);
  let alpha = 1.0 - smoothstep(- edgeWidth, edgeWidth, normalizedDist);

  // Color the square
  return vec4f(0.8, 0.2, 0.4, alpha);
}