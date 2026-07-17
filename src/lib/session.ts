export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)sessionToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setSessionToken(token: string) {
  document.cookie = `sessionToken=${token}; path=/; max-age=604800; samesite=lax`;
}

export function clearSessionToken() {
  document.cookie = "sessionToken=; path=/; max-age=0";
}
