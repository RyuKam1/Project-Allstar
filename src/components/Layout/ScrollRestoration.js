"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "allstar-scroll-positions";

function getScrollKey(pathname, searchParams) {
  const query = searchParams?.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function ScrollRestoration() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollKey = getScrollKey(pathname, searchParams);
  const previousKeyRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const navEntry = performance.getEntriesByType("navigation")[0];
    const isBackForward = navEntry?.type === "back_forward";

    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
      const savedY = stored[scrollKey];

      if (isBackForward && typeof savedY === "number") {
        requestAnimationFrame(() => {
          window.scrollTo(0, savedY);
        });
      } else if (!isBackForward && previousKeyRef.current !== scrollKey) {
        window.scrollTo(0, 0);
      }
    } catch {
      window.scrollTo(0, 0);
    }

    previousKeyRef.current = scrollKey;

    return () => {
      try {
        const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
        stored[scrollKey] = window.scrollY;
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        // ignore storage failures
      }
    };
  }, [scrollKey]);

  return null;
}
