import{C as r,c as i}from"./Chart-ClDJoXzv.js";/* empty css              */import{r as a,c}from"./line-strip.pipeline-B-wfGMxy.js";const u=`struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f
};

@vertex
fn main_vertex(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var points = array<vec2<f32>, 5>(
        vec2(-0.95, -0.95),
        vec2(0.95, -0.95),
        vec2(0.95, 0.95),
        vec2(-0.95, 0.95),
        vec2(-0.95, -0.95),
    );

    var output: VertexOutput;
  // The vertex position is directly passed through to gl_Position.
    output.position = vec4f(points[vertexIndex], 0.0, 1.0);
  // The color is also passed through to the next stage.
    output.color = vec4f(0.0, 1.0, .0, 1.0);

    return output;
}

@fragment
fn main_fragment(fragment: VertexOutput) -> @location(0) vec4<f32> {
    return fragment.color; // The color you want to clear the canvas with (RGBA).
}
`,s=new r(document.getElementById("chart"),i);s.render(({device:e,context:n})=>{a(e,n,t=>{const o=c({device:e,code:u});t.setPipeline(o),t.draw(5),t.end()})});