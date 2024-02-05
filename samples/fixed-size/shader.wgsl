struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

override width: f32;
override height: f32;
override offset: f32;

@vertex
fn main_vertex(
    @location(0) _coord: vec2f,
) -> VertexOutput {
    var output: VertexOutput;

    var _x = (_coord.x + offset) / width * 2.0;
    var _y = (_coord.y + offset) / height * 2.0;

    var x = _x / .5 - 1.0;
    var y = _y / .5 - 1.0;

    output.position = vec4f(x, y, 0.0, 1.0);
    output.color = vec4f(0.0, 1.0, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color;
}