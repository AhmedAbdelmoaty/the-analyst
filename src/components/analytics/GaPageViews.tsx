import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

/** Sends exactly one GA4 page_view per React Router path change (incl. initial load). */
export default function GaPageViews() {
  const { pathname } = useLocation();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === pathname || typeof window.gtag !== "function") return;
    last.current = pathname;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.origin + pathname,
      page_title: document.title,
    });
  }, [pathname]);
  return null;
}
