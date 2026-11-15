"""Parse IEBC's 'Final Status Report on the ECVR Phase 1' (30 Apr 2026) county table.

Usage: pdftotext -raw <report.pdf> ecvr.txt && python -I scripts/parse-ecvr-2026.py ecvr.txt data/iebc/ecvr-2026-counties.csv
Source: https://www.iebc.or.ke/uploads/resources/axHuo7uUCM.pdf
Verifies against the totals IEBC prints at the bottom of the table.
"""
import csv, re, sys

src, dst = sys.argv[1], sys.argv[2]
num = lambda s: int(s.replace(",", ""))
lines = [l.strip() for l in open(src, encoding="utf8", errors="replace").read().splitlines()]
rows, printed, i = {}, None, 0
while i < len(lines):
    ln = lines[i]
    # some county names wrap over several lines in raw mode; stitch until the figures appear
    m = re.match(r"^(\d{3}) ([A-Z][A-Z /.'-]*)$", ln)
    if m and 1 <= int(m.group(1)) <= 47:
        j, name = i + 1, m.group(2)
        while j < len(lines) and not re.match(r"^[\d,]+ [\d,]+", lines[j]) and j < i + 4:
            name += " " + lines[j]; j += 1
        ln = f"{m.group(1)} {name} {lines[j]}" if j < len(lines) else ln
        i = j
    m = re.match(r"^(\d{3}) (.+?) ([\d,]+) ([\d,]+)(?: ([\d,]+))?$", ln)
    if m and 1 <= int(m.group(1)) <= 47:
        rows[m.group(1)] = dict(code=m.group(1), name=re.sub(r"\s+", " ", m.group(2)).replace("/ ", "/"), enrolments=num(m.group(3)), transfers=num(m.group(4)),
                                changes=num(m.group(5)) if m.group(5) else "")
    m = re.match(r"^Total ([\d,]+) ([\d,]+) ([\d,]+)$", ln)
    if m: printed = tuple(num(x) for x in m.groups())
    i += 1

e = sum(r["enrolments"] for r in rows.values()); t = sum(r["transfers"] for r in rows.values())
print(f"counties parsed: {len(rows)}/47 | enrolments {e:,} (IEBC printed {printed[0]:,}) | transfers {t:,} (IEBC printed {printed[1]:,})")
assert len(rows) == 47 and (e, t) == printed[:2], "table does not reconcile with IEBC's printed totals"
with open(dst, "w", newline="", encoding="utf8") as f:
    w = csv.DictWriter(f, fieldnames=["code", "name", "enrolments", "transfers", "changes"]); w.writeheader()
    for k in sorted(rows): w.writerow(rows[k])
print("reconciled and written ->", dst)
