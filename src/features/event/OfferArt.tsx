/** Hand-drawn brand icons for the event offer screens (stroke = currentColor). */
type P = { className?: string };
export const Gamepad = ({ className, check }: P & { check?: boolean }) => (
  <svg viewBox="0 0 200 150" className={className} aria-hidden>
    <g stroke="#A61E25" strokeWidth="9" strokeLinecap="round"><path d="M38 28 20 14M58 18 52 0M22 50 4 44" /></g>
    <path d="M60 40h80c22 0 34 12 42 34l10 32c6 20-6 34-20 34-11 0-17-6-24-16l-8-11H60l-8 11c-7 10-13 16-24 16-14 0-26-14-20-34l10-32c8-22 20-34 42-34z" fill="#fff" stroke="#A61E25" strokeWidth="10" strokeLinejoin="round" />
    <path d="M62 66v30M47 81h30" stroke="#A61E25" strokeWidth="10" strokeLinecap="round" />
    <g fill="#A61E25"><circle cx="138" cy="66" r="7" /><circle cx="154" cy="80" r="7" /><circle cx="122" cy="80" r="7" /><circle cx="138" cy="94" r="7" /></g>
    {check && <g><circle cx="160" cy="118" r="30" fill="#A61E25" stroke="#fff" strokeWidth="6" /><path d="m146 118 10 10 19-20" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></g>}
  </svg>
);
export const Brain = ({ className }: P) => (
  <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M32 10v44M32 10c-4-4-12-3-13 3-6 0-9 6-7 10-5 3-5 10 0 13-2 5 2 10 7 10 1 6 9 7 13 3M32 10c4-4 12-3 13 3 6 0 9 6 7 10 5 3 5 10 0 13 2 5-2 10-7 10-1 6-9 7-13 3" />
    <path d="M24 20c-3 1-4 4-3 6M20 34c3-1 6 0 7 3M25 44c1-2 3-3 5-3M38 22h6l3 3M38 32h9M38 42h5l3-3" /><circle cx="48" cy="25" r="1.6" fill="currentColor" /><circle cx="48" cy="32" r="1.6" fill="currentColor" /><circle cx="47" cy="39" r="1.6" fill="currentColor" />
  </svg>
);
export const PadOutline = ({ className }: P) => (
  <svg viewBox="0 0 64 44" className={className} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6h24c8 0 12 4 15 12l3 11c2 8-2 13-8 13-4 0-6-2-9-6l-2-4H21l-2 4c-3 4-5 6-9 6-6 0-10-5-8-13l3-11C8 10 12 6 20 6z" /><path d="M19 17v10M14 22h10" /><circle cx="43" cy="18" r="1.8" fill="currentColor" /><circle cx="48" cy="23" r="1.8" fill="currentColor" /><circle cx="43" cy="27" r="1.8" fill="currentColor" />
  </svg>
);
export const Person = ({ className }: P) => (
  <svg viewBox="0 0 48 48" className={`ic ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden><circle cx="24" cy="16" r="9" /><path d="M7 44c0-10 7-16 17-16s17 6 17 16z" strokeLinejoin="round" /></svg>
);
export const Team = ({ className }: P) => (
  <svg viewBox="0 0 56 48" className={`ic ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden><circle cx="28" cy="14" r="7" /><circle cx="12" cy="20" r="5.5" /><circle cx="44" cy="20" r="5.5" /><path d="M15 44c0-9 6-14 13-14s13 5 13 14zM3 44c0-7 4-11 10-11M53 44c0-7-4-11-10-11" /></svg>
);
export const Arrow = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
