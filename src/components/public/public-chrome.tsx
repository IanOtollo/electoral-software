import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Header, content width and footer for the public pages. Each page wraps itself in this
 * rather than inheriting it from a layout, so a page that calls notFound() is replaced by the
 * bare 404 page with no navigation or footer around it.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">{children}</main>
      <SiteFooter />
    </>
  );
}
