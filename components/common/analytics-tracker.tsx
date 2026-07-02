"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;
    // Skip admin and API routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return;
    if (pathname === lastTracked.current) return;
    lastTracked.current = pathname;

    try {
      let sessionId = sessionStorage.getItem("_analytics_sid");
      if (!sessionId) {
        sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem("_analytics_sid", sessionId);
      }

      const referrer = document.referrer
        ? (() => { try { return new URL(document.referrer).hostname; } catch { return "direct"; } })()
        : "direct";

      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: pathname,
          referrer,
          sessionId,
          screenWidth: window.screen.width,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // silently ignore tracker errors
    }
  }, [pathname]);

  return null;
}
