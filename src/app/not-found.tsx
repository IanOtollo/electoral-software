import type { Metadata } from "next";
import { NotFoundBody } from "@/components/not-found-body";

export const metadata: Metadata = { title: "Page not found" };

/**
 * The one 404 for the whole site: a single centred page, with no navigation bar and no footer.
 * (The sections' own layouts are bypassed on purpose by having no not-found file inside them.)
 */
export default function NotFound() {
  return <NotFoundBody />;
}
