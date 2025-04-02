@group(0) @binding(0) var<uniform> resolution: vec2f;
@group(0) @binding(1) var<storage, read> points: array<f32>;
@group(0) @binding(2) var<uniform> color: vec4f;

@vertex fn vs(
    @builtin(vertex_index) vertex_index: u32,
) -> @builtin(position) vec4f {
  let dot = vec2f(points[vertex_index * 2], points[vertex_index * 2 + 1]);
  var _pos = dot / resolution;

  _pos = _pos / .5 - 1.0;

  return vec4f(_pos, 0, 1);
}

@fragment fn fs() -> @location(0) vec4f {
  return color;
}