"""Build src/data/geography.json (the area-picker tree) from the verified IEBC CSVs.

Run:  python -I scripts/build-geography.py
Counties 001-047 only. IEBC's 048 (Diaspora) and 049 (Prisons) are not geographic areas.
"""
import csv, json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "data" / "iebc"
rows = lambda n: list(csv.DictReader(open(src / n, encoding="utf8")))

def title(s: str) -> str:
    # IEBC prints names in capitals; keep small joiners lower-case and handle slashes / hyphens / apostrophes.
    small = {"of", "and", "the", "ya", "wa", "na"}
    out = []
    for i, w in enumerate(s.lower().split(" ")):
        parts = []
        for p in w.split("/"):
            p = "-".join(x[:1].upper() + x[1:] for x in p.split("-"))
            parts.append(p)
        w = "/".join(parts)
        out.append(w if (i and w.lower() in small) else w[:1].upper() + w[1:])
    return " ".join(out)

ecvr = {r["code"]: r for r in rows("ecvr-2026-counties.csv")}
tree = {}
for r in rows("counties.csv"):
    if r["code"] < "048":
        tree[r["code"]] = dict(code=r["code"], name=title(r["name"]), stations=int(r["stations"]), voters=int(r["voters"]), constituencies={},
                               newEnrolments=int(ecvr[r["code"]]["enrolments"]), transfersIn=int(ecvr[r["code"]]["transfers"]))
cons = {}
for r in rows("constituencies.csv"):
    cc = r["code"][:3]
    if cc in tree:
        c = dict(code=r["code"], name=title(r["name"]), stations=int(r["stations"]), voters=int(r["voters"]), wards=[])
        tree[cc]["constituencies"][r["code"]] = c
for r in rows("wards.csv"):
    cc, kc = r["code"][:3], r["code"][:6]
    if cc in tree and kc in tree[cc]["constituencies"]:
        tree[cc]["constituencies"][kc]["wards"].append(dict(code=r["code"], name=title(r["name"]), stations=int(r["stations"]), voters=int(r["voters"])))

counties = []
for cc in sorted(tree):
    c = tree[cc]
    c["constituencies"] = sorted(c["constituencies"].values(), key=lambda x: x["name"])
    for k in c["constituencies"]:
        k["wards"].sort(key=lambda x: x["name"])
    counties.append(c)
counties.sort(key=lambda x: x["code"])

nat = dict(stations=sum(c["stations"] for c in counties), voters=sum(c["voters"] for c in counties),
           counties=len(counties), constituencies=sum(len(c["constituencies"]) for c in counties),
           wards=sum(len(k["wards"]) for c in counties for k in c["constituencies"]))
# IEBC "Final Status Report on ECVR Phase 1", 30 Apr 2026: totals printed in the press release text
update = dict(asAt="28 April 2026", enrolmentsByCounty=sum(c["newEnrolments"] for c in counties), officeRegistrations=267249, totalNewVoters=2612725,
              sinceDate="29 September 2025", source="IEBC, Final Status Report on the Enhanced Continuous Voter Registration (ECVR) Phase 1")
assert update["enrolmentsByCounty"] + update["officeRegistrations"] == update["totalNewVoters"], "IEBC totals do not add up"
out = root / "src" / "data"; out.mkdir(parents=True, exist_ok=True)
(out / "geography.json").write_text(json.dumps(dict(source="IEBC Statistics of Voter 2022", national=nat, update=update, counties=counties), separators=(",", ":"), ensure_ascii=False), encoding="utf8")
print(nat, "->", out / "geography.json", f"{(out / 'geography.json').stat().st_size/1024:.0f} KB")
