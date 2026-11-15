/** SMS length and the Communications Authority's timing rules, kept in one place. */

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\[~]|€";

/** Number of SMS parts one recipient receives for this text. Standard GSM text allows 160 characters (153 per part when joined); anything else is Unicode, 70 (67). */
export function segmentsFor(body: string): number {
  let gsmLen = 0;
  let gsm = true;
  for (const ch of body) {
    if (GSM_BASIC.includes(ch)) gsmLen += 1;
    else if (GSM_EXT.includes(ch)) gsmLen += 2;
    else {
      gsm = false;
      break;
    }
  }
  const len = gsm ? gsmLen : [...body].length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return len <= single ? 1 : Math.ceil(len / multi);
}

/** East Africa Time is UTC+3 all year (no daylight saving). */
const EAT_MS = 3 * 60 * 60 * 1000;
export const eatHour = (ms: number) => new Date(ms + EAT_MS).getUTCHours();

/** Clause 9.2: bulk political content only between 08:00 and 17:00. */
export const SEND_WINDOW = { startHour: 8, endHour: 17 } as const;
export const isInsideSendWindow = (ms: number) => eatHour(ms) >= SEND_WINDOW.startHour && eatHour(ms) < SEND_WINDOW.endHour;

/** Clause 7.1: the request goes to the operator at least 48 hours before sending. */
export const MIN_LEAD_MS = 48 * 60 * 60 * 1000;
