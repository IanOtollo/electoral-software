"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/primitives";

/** Shows a one-time invite URL. The token is never stored in plain text server-side, so this is the only chance to copy it. */
export function InviteLink({ token, path = "/join", note }: { token: string; path?: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : `${window.location.origin}${path}/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the URL is selectable below */
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-line-strong bg-surface-2 p-3">
        <code className="block break-all font-mono text-xs text-ink select-all">{url}</code>
      </div>
      <Button type="button" variant="secondary" onClick={copy} className="w-full">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <p className="text-sm text-muted">{note ?? "This link works once and expires in 72 hours. It will not be shown again, so send it now."}</p>
    </div>
  );
}
