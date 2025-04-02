override pointSize: f32;
override opacity: f32;

struct PointData {
  @location(0) position: vec2f,
};

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
};

@group(0) @binding(0) var<uniform> resolution: vec2f;

@vertex fn vs(
    pointData: PointData,
    @builtin(vertex_index) index: u32,
    @builtin(instance_index) instance_index: u32,
) -> VSOutput {
  // коардинаты восьмиугольника
  let points = array(
    vec2f(  0,    0),
    vec2f(  1,    0),
    vec2f(  0.707,  0.707),

    vec2f(  0,    0),
    vec2f(  0.707,  0.707),
    vec2f(  0,    1),

    vec2f(  0,    0),
    vec2f(  0,    1),
    vec2f( -0.707,  0.707),

    vec2f(  0,    0),
    vec2f( -0.707,  0.707),
    vec2f( -1,    0),

    vec2f(  0,    0),
    vec2f( -1,    0),
    vec2f( -0.707, -0.707),

    vec2f(  0,    0),
    vec2f( -0.707, -0.707),
    vec2f(  0,   -1),

    vec2f(  0,    0),
    vec2f(  0,   -1),
    vec2f(  0.707, -0.707),

    vec2f(  0,    0),
    vec2f(  0.707, -0.707),
    vec2f(  1,    0),
  );
  var vsOut: VSOutput;
  let pos = points[index];

  let _pos = (pointData.position) / resolution;

  vsOut.position = vec4f((_pos / .5 - 1.0) + pos * pointSize / resolution, 0, 1);

  vsOut.color = vec4f(1, 1, 1, .5);

  let idx = instance_index;

  if (idx % 5 == 0) {
    vsOut.color = vec4f(1, .5, 0, .5);
  }

  if (idx % 5 == 1 || idx % 5 == 2) {
    vsOut.color = vec4f(0, 1, 0, .25);
  }
  if (idx % 5 == 3 || idx % 5 == 4) {
    vsOut.color = vec4f(1, 0, 0, .55);
  }

  return vsOut;
}

@fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
  return vec4f(vsOut.color.xyz, opacity);
}