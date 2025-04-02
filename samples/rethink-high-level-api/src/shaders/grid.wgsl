struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

struct Uniforms {
  resolution: vec2f,
  cellSize: f32,
  lineWidth: f32,
  color: vec4f,
}

@group(0) @binding(0)
var<uniform> uniforms: Uniforms;

@vertex
fn vs(@location(0) position: vec2f) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(position, 0.0, 1.0);
  output.uv = position * 0.5 + 0.5;
  // Convert from [-1,1] to [0,1]
  return output;
}

@fragment
fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
  // Convert uv to pixel coordinates
  let pixelPos = uv * uniforms.resolution;

  // Calculate distance to the nearest grid line
  let gridPos = pixelPos / uniforms.cellSize;
  let gridFract = fract(gridPos);
  let distToGridLine = min(gridFract, 1.0 - gridFract) * uniforms.cellSize;

  // Calculate alpha based on distance to grid line
  // Use min() to get the minimum component of the vector, which gives us the closest grid line
  let minDist = min(distToGridLine.x, distToGridLine.y);
  let lineAlpha = 1.0 - smoothstep(0.0, uniforms.lineWidth, minDist);

  // Return color with calculated alpha
  var color = uniforms.color;
  return vec4f(color.rgb, color.a * lineAlpha);
}