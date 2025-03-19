@group(0) @binding(0)
var<storage> points: array<vec2f>;
@group(0) @binding(1)
var<storage, read_write> vertices: array<vec2f>;
@group(0) @binding(2)
var<uniform> thickness: f32;

fn calculateNormal(p1: vec2f, p2: vec2f) -> vec2f {
    let dir = normalize(p2 - p1);
    return vec2f(-dir.y, dir.x);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    let segmentCount = arrayLength(&points) - 1;

    if (index >= segmentCount) {
        return;
    }

    let p1 = points[index];
    let p2 = points[index + 1];
    let normal = calculateNormal(p1, p2) * (thickness / 2.0);

    // Вершины прямоугольника
    let v1 = p1 + normal;
    let v2 = p1 - normal;
    let v3 = p2 + normal;
    let v4 = p2 - normal;

    vertices[index * 4 + 0] = v1;
    vertices[index * 4 + 1] = v2;
    vertices[index * 4 + 2] = v3;
    vertices[index * 4 + 3] = v4;
}