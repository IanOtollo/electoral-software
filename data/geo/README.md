# Kenya county outlines (for the front-page map)

`kenya-counties.geojson`: the 47 county shapes used to draw the map.

- **Source:** geoBoundaries `gbOpen` release, Kenya ADM1 (simplified), <https://www.geoboundaries.org>.
  File: `releaseData/gbOpen/KEN/ADM1/geoBoundaries-KEN-ADM1_simplified.geojson` from
  `github.com/wmgeolab/geoBoundaries` (commit `9469f09`).
- **Underlying data:** RCMRD GeoPortal / Africa GeoPortal. Boundary year represented: 2020.
- **Licence:** reported by geoBoundaries as Public Domain.
- **Downloaded:** 15 November 2026, 861,584 bytes, validated as a GeoJSON FeatureCollection of 47 features before use.

## How it is used

`python -I scripts/build-kenya-map.py` matches every shape to its IEBC county code (all 47 match one to one;
geoBoundaries names two counties differently: "Tharaka" for Tharaka - Nithi and "Nairobi" for Nairobi City),
projects it, simplifies it and writes `src/data/kenya-map.json` (about 60 KB of SVG paths).

## Limits

- County level only. No matching constituency or ward outlines are published, so a map cannot go finer.
- The outlines are for orientation. They are not an official boundary and are never used to decide which county
  a polling station belongs to; that always comes from IEBC's own station codes.
