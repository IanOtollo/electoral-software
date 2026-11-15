import { redirect } from "next/navigation";

/**
 * There is one place to sign in: the aspirant page, with its Sign in side showing.
 * This address only exists so older links and bookmarks keep working.
 */
export default async function LoginRedirect({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  redirect(`/aspirant?mode=signin${safe ? `&next=${encodeURIComponent(safe)}` : ""}`);
}
