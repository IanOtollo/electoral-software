"""Build src/data/kenya-map.json (SVG paths for the 47 counties) from the public-domain
geoBoundaries Kenya ADM1 file, matched to IEBC county codes.

Run:  python -I scripts/build-kenya-map.py
Input:  data/geo/kenya-counties.geojson   (geoBoundaries KEN ADM1, public domain, source RCMRD GeoPortal)
        src/data/geography.json           (IEBC counties, from scripts/build-geography.py)
Output: src/data/kenya-map.json
"""
import json, math, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
gj = json.loads((root / "data/geo/kenya-counties.geojson").read_text(encoding="utf8"))
geo = json.loads((root / "src/data/geography.json").read_text(encoding="utf8"))

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
# geoBoundaries uses shorter names for two counties
ALIAS = {"tharaka": "tharakanithi", "nairobi": "nairobicity"}
iebc = {norm(c["name"]): c for c in geo["counties"]}

# ---- match shapes to IEBC counties, one to one ----
matched, problems = {}, []
for f in gj["features"]:
    n = norm(f["properties"]["shapeName"]); n = ALIAS.get(n, n)
    c = iebc.get(n)
    if not c: problems.append(f"no IEBC county for shape '{f['properties']['shapeName']}'"); continue
    if c["code"] in matched: problems.append(f"county {c['name']} matched twice"); continue
    matched[c["code"]] = (c, f["geometry"])
missing = [c["name"] for c in geo["counties"] if c["code"] not in matched]
if problems or missing:
    sys.exit(f"MATCH FAILED: {problems} missing={missing}")
print(f"matched {len(matched)}/47 counties one-to-one")

# ---- projection: equirectangular, longitude scaled for the latitude (Kenya straddles the equator) ----
def rings(geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for poly in polys:
        for ring in poly[:1]:  # outer rings only: counties have no holes worth drawing at this scale
            yield ring
pts = [p for _, g in matched.values() for r in rings(g) for p in r]
lon0, lon1 = min(p[0] for p in pts), max(p[0] for p in pts)
lat0, lat1 = min(p[1] for p in pts), max(p[1] for p in pts)
kx = math.cos(math.radians((lat0 + lat1) / 2))
W = 1000.0
s = W / ((lon1 - lon0) * kx)
H = (lat1 - lat0) * s
proj = lambda lon, lat: ((lon - lon0) * kx * s, (lat1 - lat) * s)

def dp(points, tol):
    """Douglas-Peucker."""
    if len(points) < 3: return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm2 = dx * dx + dy * dy
    far, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        px, py = points[i]
        d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / math.sqrt(norm2) if norm2 else math.hypot(px - x1, py - y1)
        if d > far: far, idx = d, i
    if far <= tol: return [points[0], points[-1]]
    return dp(points[: idx + 1], tol)[:-1] + dp(points[idx:], tol)

def area(r): return abs(sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))) / 2

out = []
for code, (c, geom) in sorted(matched.items()):
    parts = []
    rs = [[proj(*p) for p in r] for r in rings(geom)]
    biggest = max(rs, key=area)
    for r in rs:
        if r is not biggest and area(r) < 6: continue  # drop specks, never a county's main body
        r = dp(r, 0.7)
        if len(r) < 3: continue
        parts.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in r) + "Z")
    out.append({"code": code, "name": c["name"], "d": "".join(parts)})

dst = root / "src/data/kenya-map.json"
dst.write_text(json.dumps({"viewBox": [0, 0, round(W), round(H)], "counties": out}, separators=(",", ":")), encoding="utf8")
print(f"viewBox 0 0 {round(W)} {round(H)} | {dst.stat().st_size / 1024:.0f} KB | {sum(len(c['d']) for c in out) / 1024:.0f} KB of path data")
