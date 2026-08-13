"use client";

import { useEffect } from "react";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Registers `/sw.js` on mount, production only. In development the SW is
 * skipped intentionally — dev caching hides source changes and creates
 * confusing bug reports. Silent no-op on browsers without SW support.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const w = window as IdleWindow;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* silent — registration failure is not user-facing */
      });
    };

    // Defer registration until after hydration is done competing for the main thread.
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(register);
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(register, 1500);
    return () => window.clearTimeout(t);
  }, []);

  return null;
}
