override thickness: f32;

@group(0) @binding(0)
var<storage> points: array<vec2f>;
@group(0) @binding(1)
var<storage, read_write> vertices: array<vec2f>;

fn calculateNormal(p1: vec2f, p2: vec2f) -> vec2f {
    let dir = normalize(p2 - p1);
    return vec2f(- dir.y, dir.x);
}

fn findIntersection(p1: vec2f, p2: vec2f, p3: vec2f, p4: vec2f) -> vec2f {
    let denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (abs(denominator) < 0.0001) {
        return p2;
    }

    let t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denominator;
    return vec2f(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
}

fn isInnerCorner(p0: vec2f, p1: vec2f, p2: vec2f) -> bool {
    let v1 = normalize(p1 - p0);
    let v2 = normalize(p2 - p1);
    return cross(vec3f(v1, 0.0), vec3f(v2, 0.0)).z > 0.0;
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
    let normal1 = calculateNormal(p1, p2) * (thickness / 2.0);

    // Calculate vertices for current segment
    var v1 = p1 + normal1;
    var v2 = p1 - normal1;
    var v3 = p2 + normal1;
    var v4 = p2 - normal1;

    // Handle intersection with previous segment
    if (index > 0) {
        let p0 = points[index - 1];
        let normal0 = calculateNormal(p0, p1) * (thickness / 2.0);
        let v0_1 = p0 + normal0;
        let v0_2 = p0 - normal0;
        let v1_1 = p1 + normal0;
        let v1_2 = p1 - normal0;

        // Only calculate intersection for inner corner
        if (isInnerCorner(p0, p1, p2)) {
            let intersection1 = findIntersection(v0_1, v1_1, v1, v3);
            v1 = intersection1;
        }
        if (!isInnerCorner(p0, p1, p2)) {
            let intersection2 = findIntersection(v0_2, v1_2, v2, v4);
            v2 = intersection2;
        }
    }

    // Handle intersection with next segment
    if (index < segmentCount - 1) {
        let p3 = points[index + 2];
        let normal2 = calculateNormal(p2, p3) * (thickness / 2.0);
        let v2_1 = p2 + normal2;
        let v2_2 = p2 - normal2;
        let v3_1 = p3 + normal2;
        let v3_2 = p3 - normal2;

        // Only calculate intersection for inner corner
        if (isInnerCorner(p1, p2, p3)) {
            let intersection3 = findIntersection(v2_1, v3_1, v3, v1);
            v3 = intersection3;
        }
        if (!isInnerCorner(p1, p2, p3)) {
            let intersection4 = findIntersection(v2_2, v3_2, v4, v2);
            v4 = intersection4;
        }
    }

    vertices[index * 4 + 0] = v1;
    vertices[index * 4 + 1] = v2;
    vertices[index * 4 + 2] = v3;
    vertices[index * 4 + 3] = v4;
}