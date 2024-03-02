import{C as u,c as s}from"./Chart-DCOpHqw7.js";/* empty css              */import{r as c,c as f}from"./line-strip.pipeline-BPR6n1Ti.js";import{m as p}from"./makeVertexBufferAndLayout-Dy244HAi.js";const l=`struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

@vertex
fn main_vertex(@location(0) _point: vec2f) -> VertexOutput {
    var output: VertexOutput;
  // The vertex position is directly passed through to gl_Position.
    output.position = vec4f(_point, 0.0, 1.0);
  // The color is also passed through to the next stage.
    output.color = vec4f(0.0, 1.0, 0.0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color; // The color you want to clear the canvas with (RGBA).
}
`,m=new u(document.getElementById("chart"),s);m.render(({device:e,context:o})=>{c(e,o,t=>{const n=[0,.95,.587785,.809017,.951057,.309017,.951057,-.309017,.587785,-.809017,0,-.95,-.587785,-.809017,-.951057,-.309017,-.951057,.309017,-.587785,.809017,0,.95],{buffer:r,layout:i}=p({vertices1DArray:n,device:e,shaderLocation:0}),a=f({device:e,code:l,vertexState:{buffers:[i]}});t.setPipeline(a),t.setVertexBuffer(0,r),t.draw(n.length/2),t.end()})});
