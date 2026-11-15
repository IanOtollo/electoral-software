import type { ReactNode } from "react";

/** Re-mounts on every navigation; the fade is pure CSS, so content is never hidden waiting for scripts. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-in">{children}</div>;
}
