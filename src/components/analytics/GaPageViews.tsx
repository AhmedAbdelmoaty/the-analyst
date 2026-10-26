import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

/** Sends exactly one GA4 page_view per React Router location change (pathname + search, incl. initial load). */
export default function GaPageViews() {
  const { pathname, search } = useLocation();
  const routeKey = pathname + search;
  const last = useRef<string | null>(null);
  const lastHref = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === routeKey || typeof window.gtag !== "function") return;
    const isInitialLoad = last.current === null;
    // Initial load: the browser referrer. Later SPA navigations: the previous full URL.
    const referrer = isInitialLoad ? document.referrer : (lastHref.current ?? document.referrer);
    last.current = routeKey;
    lastHref.current = window.location.href;
    window.gtag("event", "page_view", {
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
      page_referrer: referrer || undefined,
    });
  }, [routeKey, pathname, search]);
  return null;
}
