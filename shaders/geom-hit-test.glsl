struct TriangleHitTestResult {
    bool hit;
    float edge0, edge1;
    float distance;
};


/* Möller-Trumbore based ray-triangle intersection test */
TriangleHitTestResult hitTestTriangle(TrianglePositions tri, Ray ray) {
    const float eps = 0.000001;

    TriangleHitTestResult res;
    res.hit = false;

    vec3 rayCrossEdge0 = cross(ray.dir, tri.edge0);
    float det = dot(rayCrossEdge0, tri.edge1);

    if(abs(det) < eps) {
        return res;
    }

    float inverseDet = 1.0 / det;
    vec3 vertToOrigin = ray.origin - tri.vert;
    res.edge1 = dot(vertToOrigin, rayCrossEdge0) * inverseDet;

    if(res.edge1 < -eps || res.edge1 > 1.0 + eps) {
        return res;
    }

    vec3 vertToOriginCrossEdge1 = cross(vertToOrigin, tri.edge1);

    res.edge0 = dot(ray.dir, vertToOriginCrossEdge1) * inverseDet;

    if(res.edge0 < -eps || res.edge0 + res.edge1 > 1.0 + eps) {
        return res;
    }

    res.distance = dot(tri.edge0, vertToOriginCrossEdge1) * inverseDet;

    if(res.distance < 0.0) {
        return res;
    }

    res.hit = true;
    return res;
}


bool hitTestBox(Box box, Ray ray) {
    vec3 vert0 = (box.minBound - ray.origin) * ray.inverseDir;
    vec3 vert1 = (box.maxBound - ray.origin) * ray.inverseDir;
    vec3 closeVec = min(vert0, vert1);
    vec3 farVec   = max(vert0, vert1);
    float close   = max(closeVec.x, max(closeVec.y, closeVec.z));
    float far     = min(farVec.x,   min(farVec.y,   farVec.z));
    return close <= far;
}
