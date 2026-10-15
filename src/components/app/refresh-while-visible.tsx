"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface RefreshWhileVisibleProps {
  intervalMs?: number;
}

/** Refreshes server-rendered applicant data while the page remains open. */
export function RefreshWhileVisible({ intervalMs = 15_000 }: RefreshWhileVisibleProps) {
  const router = useRouter();
  const lastRefreshAt = useRef(0);

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;

    const now = Date.now();
    if (now - lastRefreshAt.current < 3_000) return;

    lastRefreshAt.current = now;
    router.refresh();
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(refresh, intervalMs);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [intervalMs, refresh]);

  return null;
}
