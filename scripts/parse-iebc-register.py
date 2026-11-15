import re, sys, csv, collections, pathlib
raw = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
num = lambda s: int(s.replace(",", ""))
rd = lambda n: (raw / f"{n}.txt").read_text(encoding="utf8", errors="replace").splitlines()

# --- ground truth from IEBC's own aggregate files ---
county_official, const_official, official_total = {}, {}, None
for ln in rd("rov_per_county"):
    m = re.match(r"^(\d{3}) (.+?) ([\d,]+)$", ln.strip())
    if m: county_official[m.group(1)] = (m.group(2), num(m.group(3)))
prev_num = None
for ln in rd("rov_per_constituency"):
    m = re.match(r"^(\d{3}) (.+?) (\d{3}) (.+?) ([\d,]+)$", ln.strip())
    if m: const_official[m.group(1) + m.group(3)] = (m.group(4), num(m.group(5)))
    if ln.strip() == "Total" and prev_num is not None: official_total = prev_num
    mm = re.match(r"^([\d,]{5,})$", ln.strip())
    prev_num = num(mm.group(1)) if mm else (prev_num if ln.strip() == "Total" else None)
ward_official = {}
for ln in rd("rov_per_caw"):
    m = re.match(r"^(\d{3}) (.+?) (\d{3}) (.+?) (\d{4}) (.+?) ([\d,]+)$", ln.strip())
    if m: ward_official[m.group(1) + m.group(3) + m.group(5)] = (m.group(6), num(m.group(7)))

# --- stations: one complete row per line in raw mode ---
ROW = re.compile(r"^(\d{3}) (.+?) (\d{3}) (.+?) (\d{4}) (.+?) (\d{3}) (.+?) ?(\d{15}) ?(.+?) ?([\d,]+)$")
stations, names, unparsed, mismatch = [], collections.defaultdict(dict), [], 0
HIER = re.compile(r"^\d{3} .+ \d{3} .+ \d{4} .+ \d{3} .+$")
def logical_rows(lines):
    L = [x.strip() for x in lines]
    i = 0
    while i < len(L):
        ln = L[i]
        if HIER.match(ln) and not re.search(r"\d{15}", ln) and i + 1 < len(L) and re.match(r"^\d{15}", L[i + 1]):
            row = ln + " " + L[i + 1]; i += 2
            if not re.search(r" [\d,]+$", L[i - 1]) or re.fullmatch(r"\d{15}", L[i - 1].split()[0]) and not re.search(r"\d{15} .+ [\d,]+$", L[i - 1]):
                if i < len(L) and re.fullmatch(r"[\d,]+", L[i]): row += " " + L[i]; i += 1
            yield row; continue
        if re.search(r"\d{15}", ln): yield ln
        i += 1
for ln in logical_rows(rd("rov_per_polling_station")):
    m = ROW.match(ln)
    if not m: unparsed.append(ln[:170]); continue
    cc, cn, kc, kn, wc, wn, rc, rn, code, sname, v = m.groups()
    if code[:13] != cc + kc + wc + rc: mismatch += 1
    names["county"][cc] = cn; names["const"][cc + kc] = kn; names["ward"][cc + kc + wc] = wn; names["centre"][cc + kc + wc + rc] = rn
    stations.append(dict(code=code, county=cc, constituency=cc + kc, ward=cc + kc + wc, centre=cc + kc + wc + rc, stream=code[13:15], name=sname.strip(), voters=num(v)))

print(f"stations parsed: {len(stations):,} | unparsed code-lines: {len(unparsed)} | printed-hierarchy != code: {mismatch} | duplicate codes: {len(stations)-len({s['code'] for s in stations})}")
for u in unparsed[:5]: print("  UNPARSED:", u)
std = [s for s in stations if s["county"] < "048"]     # 001-047 = counties; 048 diaspora, 049 prisons
print(f"counties={len({s['county'] for s in std})} constituencies={len({s['constituency'] for s in std})} wards={len({s['ward'] for s in std})} centres={len({s['centre'] for s in std})}   (plus {sum(1 for s in stations if s['county']>='048')} diaspora/prison stations)")
total = sum(s["voters"] for s in std)
print(f"registered voters (counties 001-047): {total:,} | IEBC constituency-file total: {official_total:,} -> {'EXACT MATCH' if total == official_total else 'DIFF ' + format(total - official_total, ',')}")

def check(label, field, official):
    agg = collections.Counter()
    for s in std: agg[s[field]] += s["voters"]
    bad = [(k, official[k][0], official[k][1], agg.get(k, 0)) for k in official if agg.get(k, 0) != official[k][1]]
    print(f"{label}: {len(official)-len(bad)}/{len(official)} match IEBC's figure exactly" + (f" | first diffs: {bad[:4]}" if bad else ""))
check("county      ", "county", {k: v for k, v in county_official.items()})
check("constituency", "constituency", const_official)
check("ward        ", "ward", ward_official)

def dump(fn, field, nm):
    agg, cnt = collections.Counter(), collections.Counter()
    for s in stations: agg[s[field]] += s["voters"]; cnt[s[field]] += 1
    with open(out / fn, "w", newline="", encoding="utf8") as f:
        w = csv.writer(f); w.writerow(["code", "name", "stations", "voters"])
        for c in sorted(agg): w.writerow([c, nm.get(c, ""), cnt[c], agg[c]])
with open(out / "stations.csv", "w", newline="", encoding="utf8") as f:
    w = csv.writer(f); cols = ["code","county","constituency","ward","centre","stream","name","voters"]; w.writerow(cols)
    for s in stations: w.writerow([s[k] for k in cols])
dump("counties.csv", "county", names["county"]); dump("constituencies.csv", "constituency", names["const"])
dump("wards.csv", "ward", names["ward"]); dump("centres.csv", "centre", names["centre"])
print("written ->", out)
