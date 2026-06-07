"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RouteFocus() {
  const pathname = usePathname();

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) {
      main.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}
