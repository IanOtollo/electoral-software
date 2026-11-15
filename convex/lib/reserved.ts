/**
 * A workspace lives at /<handle>, so a handle must never collide with a real route
 * or a word that could be mistaken for one. Used at sign-up and when an admin
 * creates a workspace. Keep in step with the public prefixes in src/proxy.ts.
 */
export const RESERVED_HANDLES = new Set([
  "admin", "app", "api", "login", "logout", "signin", "signup", "register", "aspirant", "area", "agent", "agents",
  "join", "legal", "design", "static", "public", "assets", "favicon", "robots", "sitemap", "www", "help", "support",
  "about", "contact", "terms", "privacy", "cookies", "settings", "dashboard", "account", "billing", "results",
  "iebc", "official", "system", "root", "null", "undefined",
]);

export function isReservedHandle(h: string): boolean {
  return RESERVED_HANDLES.has(h) || h.startsWith("_") || h.length < 2;
}

/** "Asha Otieno" -> "asha-otieno". Accents are removed; anything else becomes a hyphen. */
export function handleFromName(name: string): string {
  const h = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return h.length >= 2 ? h : "aspirant";
}
