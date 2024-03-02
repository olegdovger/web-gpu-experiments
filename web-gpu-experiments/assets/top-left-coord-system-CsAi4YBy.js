import{C as s,c as m}from"./Chart-Dhms8Wuz.js";/* empty css              */import{r as l,c as r}from"./line-strip.pipeline-CD_QxH-7.js";import{m as x}from"./makeVertexBufferAndLayout-Dy244HAi.js";import{m as v}from"./makeVertexBuffer-BPjQv0FQ.js";const y=`struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

@vertex
fn main_vertex(@location(0) _point: vec2f) -> VertexOutput {
    var output: VertexOutput;

    var x = _point.x / .5 - 1.0;
    var y = (1.0 - _point.y) / .5 - 1.0;

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
    var y = (1.0 - _point.y) / .5 - 1.0;

    output.position = vec4f(x, y, 0.0, 1.0);
    output.color = vec4f(1.0, 0.5, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color;
}`,V=new s(document.getElementById("chart"),m);V.render(({device:e,context:i})=>{l(e,i,t=>{const n=[.05,.05,.95,.05,.95,.95,.05,.05],{buffer:u,layout:a}=x({vertices1DArray:n,device:e,shaderLocation:0}),f=r({device:e,code:y,vertexState:{buffers:[a]}});t.setPipeline(f),t.setVertexBuffer(0,u),t.draw(n.length/2);const o=[.001,.999,.001,.001,.999,.001],c=v({vertices1DArray:o,device:e}),p=r({device:e,code:g,vertexState:{buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:"float32x2"}],stepMode:"vertex"}]}});t.setPipeline(p),t.setVertexBuffer(0,c),t.draw(o.length/2),t.end()})});
