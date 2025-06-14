// Vertex input: vec2 position
struct VertexInput {
  @location(0) position: vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
}

// struct CanvasUniforms {
//   size: vec2<f32>,
// }

struct Camera {
  projection: mat4x4f,
  view: mat4x4f,
}

@group(0) @binding(0)
var<uniform> color: vec4<f32>;

@vertex
fn main_vertex(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let pos = input.position;
  let ndc = pos + vec2<f32>(-1.0, -1.0);

  out.position = vec4<f32>(ndc.x, -ndc.y, 0.0, 1.0);

  return out;
}

@fragment
fn main_fragment() -> @location(0) vec4<f32> {
  return color;
}