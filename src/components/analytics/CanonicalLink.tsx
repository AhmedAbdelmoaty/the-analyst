import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ORIGIN = 'https://theanalystedu.com';

/** Keeps canonical and og:url self-referencing per path (query strings like fbclid are dropped). */
export default function CanonicalLink() {
  const { pathname } = useLocation();
  useEffect(() => {
    const url = `${ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = url;
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
  }, [pathname]);
  return null;
}
