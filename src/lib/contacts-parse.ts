import { normalizeKenyanPhone } from "../../convex/lib/phone";

export type ParsedContact = { name: string; phone: string; group: string };
export type ParseResult = { valid: ParsedContact[]; invalid: string[]; duplicates: number };

/** Splits one line on a comma, semicolon or tab, honouring double quotes. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "," || ch === ";" || ch === "\t")) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Reads pasted text or a CSV file. A line may be just a number, or "name, number" or "name, number, group"
 * in any column order: the column that holds a valid Kenyan number is taken as the phone.
 * A header row ("name, phone, group") is skipped.
 */
export function parseContacts(text: string, defaultGroup = ""): ParseResult {
  const valid: ParsedContact[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = cells(line);
    const at = parts.findIndex((p) => normalizeKenyanPhone(p));
    if (at < 0) {
      if (!/phone|number|mobile|msisdn/i.test(line)) invalid.push(line.slice(0, 60));
      continue;
    }
    const phone = normalizeKenyanPhone(parts[at])!;
    if (seen.has(phone)) {
      duplicates++;
      continue;
    }
    seen.add(phone);
    const rest = parts.filter((_, i) => i !== at && parts[i]);
    valid.push({ phone, name: rest[0] ?? "", group: rest[1] ?? defaultGroup });
  }
  return { valid, invalid, duplicates };
}
