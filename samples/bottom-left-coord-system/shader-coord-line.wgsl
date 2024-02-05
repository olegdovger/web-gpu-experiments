struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

@vertex
fn main_vertex(@location(0) _point: vec2f) -> VertexOutput {
    var output: VertexOutput;

    var x = _point.x / .5 - 1.0;
    var y = _point.y / .5 - 1.0;

    output.position = vec4f(x, y, 0.0, 1.0);
    output.color = vec4f(1.0, 0.5, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color;
}