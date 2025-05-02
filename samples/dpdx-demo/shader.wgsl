struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

struct InputData {
  time: f32,
  mouseX: f32,
  mouseY: f32,
}

@group(0) @binding(0)
var<uniform> input: InputData;

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
  // Create animated sine waves
  let xGradient = sin(uv.x * 50.0 - input.time * 0.2);

  // Calculate the rate of change in both x and y directions
  let derivative = dpdx(xGradient) * 5.0;

  // Visualize the derivative
  return vec4f(0.0, derivative, 0.0, 1);
}