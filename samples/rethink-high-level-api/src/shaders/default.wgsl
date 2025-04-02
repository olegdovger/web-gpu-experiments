struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@group(0) @binding(0)
var<uniform> resolution: vec2f;
@group(0) @binding(1)
var<uniform> color: vec4f;

@vertex
fn vs(@location(0) position: vec2f) -> VertexOutput {
  var output: VertexOutput;

  // Convert to clip space
  var pos = position / resolution * 2.0 - 1.0;
  pos.y = - pos.y;
  // Flip Y for screen coordinates

  output.position = vec4f(pos, 0.0, 1.0);
  output.color = color;

  return output;
}

@fragment
fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}