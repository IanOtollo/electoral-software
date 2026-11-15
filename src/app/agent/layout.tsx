import type { Metadata } from "next";
import type { ReactNode } from "react";

// Agent links are private: keep them out of search results and caches.
export const metadata: Metadata = { title: "Polling agent", robots: { index: false, follow: false } };

export default function AgentLayout({ children }: { children: ReactNode }) {
  return children;
}
