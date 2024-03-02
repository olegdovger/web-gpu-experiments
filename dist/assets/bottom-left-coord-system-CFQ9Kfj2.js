import{C as l,c as x}from"./Chart-ClDJoXzv.js";/* empty css              */import{r as v,c as r}from"./line-strip.pipeline-B-wfGMxy.js";import{m as i}from"./makeVertexBufferAndLayout-Dy244HAi.js";const y=`struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

@vertex
fn main_vertex(@location(0) _point: vec2f) -> VertexOutput {
    var output: VertexOutput;

    var x = _point.x / .5 - 1.0;
    var y = _point.y / .5 - 1.0;

    output.position = vec4f(x, y, 0.0, 1.0);
    output.color = vec4f(0.0, 1.0, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color;
}`,g=`struct VertexOutput {
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
}`,V=new l(document.getElementById("chart"),x);V.render(({device:n,context:u})=>{v(n,u,t=>{const e=[.05,.05,.95,.05,.95,.95,.05,.05],{buffer:a,layout:f}=i({vertices1DArray:e,device:n,shaderLocation:0}),c=r({device:n,code:y,vertexState:{buffers:[f]}});t.setPipeline(c),t.setVertexBuffer(0,a),t.draw(e.length/2);const o=[.001,.999,.001,.001,.999,.001],{buffer:p,layout:s}=i({vertices1DArray:o,device:n,shaderLocation:0}),m=r({device:n,code:g,vertexState:{buffers:[s]}});t.setPipeline(m),t.setVertexBuffer(0,p),t.draw(o.length/2),t.end()})});
