import{C as s,c}from"./Chart-DCOpHqw7.js";/* empty css              */import{r as u,c as m}from"./line-strip.pipeline-BPR6n1Ti.js";import{m as v}from"./makeVertexBuffer-BPjQv0FQ.js";const p=`struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

override width: f32;
override height: f32;
override offset: f32;
override devicePixelRatio: f32;

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
`,x=new s(document.getElementById("chart"),c);x.render(({device:e,context:r,width:o,height:i})=>{u(e,r,t=>{const n=[0,0,50,0,50,50,0,50,0,0],f=v({vertices1DArray:n,device:e}),a=m({device:e,code:p,vertexState:{buffers:[{arrayStride:8,attributes:[{shaderLocation:0,offset:0,format:"float32x2"}],stepMode:"vertex"}]},vertexConstants:{width:o,height:i,offset:50}});t.setPipeline(a),t.setVertexBuffer(0,f),t.draw(n.length/2),t.end()})});
