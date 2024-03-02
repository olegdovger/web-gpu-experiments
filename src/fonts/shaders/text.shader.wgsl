struct VertexInput {
  @location(0) position: vec2f,
  @builtin(instance_index) instance: u32
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(1) @interpolate(flat) instance: u32,
  @location(2) @interpolate(linear) vertex: vec2f,
  @location(3) @interpolate(linear) uv: vec2f,
};

struct Glyph {
  position: vec2f,
  _unused: f32,
  fontSize: f32,
  color: vec4f,
  size: vec2f,
  uv: vec2f,
  uvSize: vec2f,
  window: vec2f,
};

struct GlyphData {
  glyphs: array<Glyph>,
};

@group(0) @binding(0) var<storage> text: GlyphData;
@group(0) @binding(1) var fontAtlasSampler: sampler;
@group(0) @binding(2) var fontAtlas: texture_2d<f32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    let g = text.glyphs[input.instance];
    let vertex = mix(g.position.xy, g.position.xy + g.size, input.position);

    output.position = vec4f(vertex / g.window * 2 - 1, 0, 1);
    output.position.y = -output.position.y;
    output.vertex = vertex;
    output.uv = mix(g.uv, g.uv + g.uvSize, input.position);
    output.instance = input.instance;
    return output;
}

override devicePixelRatio: f32 = 2.0;

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    let g = text.glyphs[input.instance];
    let distance = textureSample(fontAtlas, fontAtlasSampler, input.uv).a;

    var width = mix(0.4, 0.1, clamp(g.fontSize, 0, 40) / 40.0);
    width /= devicePixelRatio;

    let alpha = g.color.a * smoothstep(0.5 - width, 0.5 + width, distance);

    return vec4f(g.color.rgb, alpha);
}
