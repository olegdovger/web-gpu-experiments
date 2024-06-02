//struct VertexInput {
//  @location(position) position: vec2f,
//  @location(1) color: vec4f,
//};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

override width: f32;
override height: f32;
override offset: f32;

@vertex
fn main_vertex(@location(0) coord: vec2f, @location(1) color: vec4f) -> VertexOutput {
    var output: VertexOutput;

    var _x = (coord.x + offset) / width;
    var _y = (coord.y + offset) / height;

    var x = _x / .5 - 1.0;
    var y = _y / .5 - 1.0;

    output.position = vec4f(x, y, 0.0, 1.0);
    output.color = color;
    // output.color = vec4f(0.0, 1.0, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color;
}
