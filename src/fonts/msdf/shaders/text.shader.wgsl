// Positions for simple quad geometry
const pos = array(vec2f(0, - 1), vec2f(1, - 1), vec2f(0, 0), vec2f(1, 0));

struct VertexInput {
  @builtin(vertex_index) vertex: u32,
  @builtin(instance_index) instance: u32,
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) texcoord: vec2f,
}

struct Char {
  texOffset: vec2f,
  texExtent: vec2f,
  size: vec2f,
  offset: vec2f,
}

struct FormattedText {
  transform: mat4x4f,
  color: vec4f,
  scale: f32,
  chars: array<vec3f>,
}

struct Camera {
  projection: mat4x4f,
  view: mat4x4f,
}

// Font bindings
@group(0) @binding(0)
var fontTexture: texture_2d<f32>;
@group(0) @binding(1)
var fontSampler: sampler;
@group(0) @binding(2)
var<storage> chars: array<Char>;

// Text bindings
@group(1) @binding(0)
var<uniform> camera: Camera;
@group(1) @binding(1)
var<storage> text: FormattedText;
@group(1) @binding(2)
var<storage> textOffset: vec2f;

@group(2) @binding(0)
var<uniform> canvasSize: vec2f;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  let textElement = text.chars[input.instance];
  let _char = chars[u32(textElement.z)];
  let charPos = (pos[input.vertex] * _char.size + textElement.xy + _char.offset) * text.scale;

  var output: VertexOutput;
  output.position = camera.projection * camera.view * text.transform * vec4f(charPos, 0, 1);
  output.position.x += 2.0 * textOffset.x / canvasSize.x;
  output.position.y -= 2.0 * textOffset.y / canvasSize.y;

  output.texcoord = pos[input.vertex] * vec2f(1, - 1);
  output.texcoord *= _char.texExtent;
  output.texcoord += _char.texOffset;
  return output;
}

fn sampleMsdf(texcoord: vec2f) -> f32 {
  let c = textureSample(fontTexture, fontSampler, texcoord);
  return max(min(c.r, c.g), min(max(c.r, c.g), c.b));
}

// Antialiasing technique from Paul Houx
// https://github.com/Chlumsky/msdfgen/issues/22#issuecomment-234958005
@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let sz = vec2f(textureDimensions(fontTexture, 0));
  let fwidthX = fwidth(input.texcoord.x) * sz.x;
  let fwidthY = fwidth(input.texcoord.y) * sz.y;
  // pxRange (AKA distanceRange) comes from the msdfgen tool. Don McCurdy's tool
  // uses the default which is 4.
  let toPixels = 4.0 / length(vec2f(fwidthX, fwidthY));

  let sigDist = sampleMsdf(input.texcoord) - .5;
  let pxDist = sigDist * toPixels;

  let edgeWidth = .5;

  let alpha = smoothstep(- edgeWidth, edgeWidth, pxDist);

  if (alpha < 0.001) {
    discard;
  }

  return vec4f(text.color.rgb, text.color.a * alpha);
}