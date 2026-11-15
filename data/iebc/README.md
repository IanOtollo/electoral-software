# IEBC 2022 register of voters: geography and polling stations

Machine-readable extract of the Independent Electoral and Boundaries Commission's
published **"Statistics of Voter 2022"** files. This is the reference geography for
the area picker, station coverage and turnout calculations.

## Source (official, published by IEBC)

Page: https://www.iebc.or.ke/registration/?Statistics_of_Voter_2022

| File | Used for |
|------|----------|
| `rov_per_polling_station.pdf` (45 MB) | Every polling station and its registered voters (the data in `stations.csv`) |
| `rov_per_constituency.pdf` | County/constituency names; ground truth to verify station sums |
| `rov_per_caw.pdf` | Ward names; ground truth to verify station sums |
| `rov_per_county.pdf` | County names; ground truth to verify station sums |

The register date is not stated on the IEBC page. Treat this as the register used for
the **August 2022 General Election**. Refresh when IEBC publishes a newer one.

## Files

| File | Rows | Columns |
|------|------|---------|
| `counties.csv` | 49 | code, name, stations, voters |
| `constituencies.csv` | 292 | code, name, stations, voters |
| `wards.csv` | 1,463 | code, name, stations, voters |
| `centres.csv` | polling centres | code, name, stations, voters |
| `stations.csv` | 46,229 | code, county, constituency, ward, centre, stream, name, voters |

Codes are IEBC's own. A station code is 15 digits: county (3) + constituency (3) +
ward (4) + centre (3) + stream (2). Ward codes are national (0001 to 1450).

Counties `001`-`047` are the 47 counties. `048` (Diaspora, 27 stations) and `049`
(Prisons, 106 stations) are special IEBC areas that are **not** part of the 290
constituencies. Filter them out of county/constituency totals.

## Verification (run by `scripts/parse-iebc-register.py`)

The station-level parse was reconciled against IEBC's own aggregate files:

- 46,229 stations parsed, 0 unparsed rows, 0 duplicate codes
- Registered voters, counties 001-047: **22,102,532**, exactly IEBC's printed total
- 47 / 47 counties match IEBC's figure exactly
- 290 / 290 constituencies match IEBC's figure exactly
- 1,448 / 1,450 wards match exactly

### Known discrepancy in IEBC's own files

Two neighbouring wards in Kimilili constituency differ by 87 voters in opposite
directions: `0392231111 KIBINGEI` (IEBC ward file 15,664, sum of its stations 15,751)
and `0392231112 KIMILILI` (IEBC 19,062, stations 18,975). Net effect on the
constituency is zero, so one centre appears to be coded under the neighbouring ward in
IEBC's station file. We follow the station codes.

## Notes

- A "polling station" here is a **stream** (IEBC splits each polling centre into
  streams of at most 700 voters). A polling **centre** is a physical venue and can hold
  many stations.
- Station voter counts are the 2022 register. They shift whenever IEBC re-streams, so
  never present them as current registration figures.
- Regenerate: download the PDFs, run `pdftotext -raw` on each, then
  `python -I scripts/parse-iebc-register.py <dir-with-txt> data/iebc`.
  Raw mode is required: layout mode drops voter counts on some rows.

## 2026 registration update (newer than the 2022 register)

IEBC has **not** published an updated register or per-ward / per-station figures since 2022.
What it has published is the outcome of the 2025-26 registration drive:

- Source: *Final Status Report on the Enhanced Continuous Voter Registration (ECVR) Phase 1*,
  IEBC press release, 30 April 2026: https://www.iebc.or.ke/uploads/resources/axHuo7uUCM.pdf
- `ecvr-2026-counties.csv`: enrolments, transfers of registration and changes of particulars
  per county, as at 28 April 2026. Parsed by `scripts/parse-ecvr-2026.py`, which refuses to
  write unless the 47 rows add up to IEBC's printed totals (2,345,476 enrolments, 243,630 transfers).
- Headline: **2,612,725 new voters** between 29 September 2025 and 28 April 2026
  (2,345,476 under ECVR Phase 1 + 267,249 at IEBC offices, the latter not broken down by county).

These are *enrolments*, not a certified register. IEBC says new entries are still being
de-duplicated, verified for 30 days, independently audited and then gazetted, and that polling
stations "shall be allocated during an election". So the app shows 2026 enrolments as a labelled
update beside the certified 2022 counts and never adds them together.

Checked, not used: third-party sites quote higher "current" county totals (e.g. Nairobi City
2,743,155). They don't reconcile with IEBC's own figures (2,415,310 + 276,886 = 2,692,196), so
they are excluded until IEBC publishes a certified register.
