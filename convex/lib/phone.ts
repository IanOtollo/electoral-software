/** Normalise a Kenyan mobile number to +254XXXXXXXXX, or null if it is not one. */
export function normalizeKenyanPhone(input: string): string | null {
  const d = input.replace(/[^\d]/g, "");
  let national: string | null = null;
  if (d.length === 10 && d.startsWith("0")) national = d.slice(1);
  else if (d.length === 12 && d.startsWith("254")) national = d.slice(3);
  else if (d.length === 9) national = d;
  if (!national || !/^[71]\d{8}$/.test(national)) return null;
  return `+254${national}`;
}
