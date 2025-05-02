@group(0) @binding(0)
var<uniform> resolution: vec2f;

@group(0) @binding(1)
var<uniform> center: vec2f;

@group(0) @binding(2)
var<uniform> size: vec2f;

@group(0) @binding(3)
var<uniform> smoothness: f32;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var output: VertexOutput;

  // Позиции вершин для двух треугольников (полноэкранный quad)
  var pos: vec2f;
  switch vertexIndex {
    case 0u : {
      pos = vec2f(- 1.0, - 1.0);
    }
    // левый нижний
    case 1u : {
      pos = vec2f(1.0, - 1.0);
    }
    // правый нижний
    case 2u : {
      pos = vec2f(- 1.0, 1.0);
    }
    // левый верхний
    case 3u : {
      pos = vec2f(- 1.0, 1.0);
    }
    // левый верхний (повтор)
    case 4u : {
      pos = vec2f(1.0, - 1.0);
    }
    // правый нижний (повтор)
    case 5u : {
      pos = vec2f(1.0, 1.0);
    }
    // правый верхний
    default : {
      pos = vec2f(0.0, 0.0);
    }
    // никогда не произойдет
  }

  output.position = vec4f(pos, 0.0, 1.0);

  // Преобразуем координаты из [-1,1] в [0,1] для UV
  let uv = pos * 0.5 + 0.5;
  output.uv = vec2f(uv.x, 1.0 - uv.y);
  // Инвертируем Y
  return output;
}

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
  let fragCoord = uv * resolution;
  let d = distance(fragCoord, center);
  let r = size.x / 2.0;
  let circle = smoothstep(r + smoothness, r - smoothness, d);
  return vec4f(1.0, 0.5, 0.0, circle);
}