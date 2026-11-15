import raw from "@/data/geography.json";

export type Level = "national" | "county" | "constituency" | "ward";

type Ward = { code: string; name: string; stations: number; voters: number };
type Constituency = Ward & { wards: Ward[] };
type County = Ward & { constituencies: Constituency[]; newEnrolments: number; transfersIn: number };
export type RegisterUpdate = { asAt: string; enrolmentsByCounty: number; officeRegistrations: number; totalNewVoters: number; sinceDate: string; source: string };
type Data = { source: string; update: RegisterUpdate; national: { stations: number; voters: number; counties: number; constituencies: number; wards: number }; counties: County[] };

const data = raw as Data;

export type Child = { code: string; name: string; stations: number; voters: number; href: string };
export type Area = {
  level: Level;
  code: string;
  name: string;
  stations: number;
  voters: number;
  crumbs: { name: string; href: string }[];
  childLabel: string | null;
  children: Child[];
  counts: { label: string; value: number }[];
  /** IEBC 2026 registration drive figure for this area. Only published per county. */
  newEnrolments: number | null;
};

const href = (code: string) => `/area/${code}`;
const kids = (xs: Ward[]): Child[] => xs.map((x) => ({ code: x.code, name: x.name, stations: x.stations, voters: x.voters, href: href(x.code) }));

export const counties = data.counties;
export const source = data.source;
export const registerUpdate = data.update;

export function resolveArea(code?: string): Area | null {
  if (!code) {
    const n = data.national;
    return {
      level: "national", code: "", name: "Kenya", stations: n.stations, voters: n.voters, crumbs: [],
      childLabel: "Counties", children: kids(data.counties),
      newEnrolments: data.update.totalNewVoters,
      counts: [{ label: "Counties", value: n.counties }, { label: "Constituencies", value: n.constituencies }, { label: "Wards", value: n.wards }],
    };
  }
  if (!/^\d+$/.test(code)) return null;
  const county = data.counties.find((c) => c.code === code.slice(0, 3));
  if (!county) return null;
  const root = { name: "Kenya", href: "/" };

  if (code.length === 3) {
    return {
      level: "county", code, name: county.name, stations: county.stations, voters: county.voters, crumbs: [root], newEnrolments: county.newEnrolments,
      childLabel: "Constituencies", children: kids(county.constituencies),
      counts: [{ label: "Constituencies", value: county.constituencies.length }, { label: "Wards", value: county.constituencies.reduce((n, k) => n + k.wards.length, 0) }],
    };
  }
  const cons = county.constituencies.find((k) => k.code === code.slice(0, 6));
  if (!cons) return null;
  if (code.length === 6) {
    return {
      level: "constituency", code, name: cons.name, stations: cons.stations, voters: cons.voters,
      crumbs: [root, { name: county.name, href: href(county.code) }],
      childLabel: "Wards", children: kids(cons.wards), counts: [{ label: "Wards", value: cons.wards.length }], newEnrolments: null,
    };
  }
  const ward = cons.wards.find((w) => w.code === code);
  if (!ward || code.length !== 10) return null;
  return {
    level: "ward", code, name: ward.name, stations: ward.stations, voters: ward.voters,
    crumbs: [root, { name: county.name, href: href(county.code) }, { name: cons.name, href: href(cons.code) }],
    childLabel: null, children: [], counts: [], newEnrolments: null,
  };
}

/** Selection path for the picker, derived from any area code. */
export function pathOf(code?: string) {
  return { county: code?.slice(0, 3) ?? "", constituency: code && code.length >= 6 ? code.slice(0, 6) : "", ward: code && code.length === 10 ? code : "" };
}
