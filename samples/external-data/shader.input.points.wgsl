struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

@vertex
fn main_vertex(@location(0) _point: vec2f) -> VertexOutput {
    var output: VertexOutput;
  // The vertex position is directly passed through to gl_Position.
    output.position = vec4f(_point, 0.0, 1.0);
  // The color is also passed through to the next stage.
    output.color = vec4f(0.0, 1.0, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color; // The color you want to clear the canvas with (RGBA).
}
