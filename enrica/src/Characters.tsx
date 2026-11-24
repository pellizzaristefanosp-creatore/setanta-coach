/** Giuliano (cappello da apicoltore e barba bianca) ed Enrica, disegnati a mano in SVG. */
export function Tonino({ talking }: { talking: boolean }) {
  return (
    <svg className={`who-svg ${talking ? "talk" : ""}`} viewBox="0 0 120 130" role="img" aria-label="Giuliano">
      <ellipse cx="60" cy="126" rx="34" ry="4" fill="rgba(90,67,48,.12)" />
      <path d="M22 128c2-28 16-40 38-40s36 12 38 40Z" fill="#f2ead8" stroke="#8a7058" strokeWidth="2" />
      <path d="M52 92l8 12 8-12" fill="none" stroke="#8a7058" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="58" r="26" fill="#f6d2b4" />
      <path d="M38 66c4 18 14 24 22 24s18-6 22-24c-6 6-14 7-22 7s-16-1-22-7Z" fill="#fbfaf6" stroke="#d9d0c0" />
      <circle cx="50" cy="56" r="3" fill="#5a4330" />
      <circle cx="70" cy="56" r="3" fill="#5a4330" />
      <path d="M44 48q6-4 12 0M64 48q6-4 12 0" stroke="#bdb3a3" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse className="mouth" cx="60" cy="72" rx="6" ry="2.5" fill="#8a4b3a" />
      <ellipse cx="60" cy="36" rx="44" ry="9" fill="#e9dcb8" stroke="#a88a5c" strokeWidth="2" />
      <path d="M36 36c0-14 10-22 24-22s24 8 24 22Z" fill="#f0e4c4" stroke="#a88a5c" strokeWidth="2" />
      <path d="M16 38c4 22 10 40 18 50M104 38c-4 22-10 40-18 50" stroke="rgba(90,67,48,.25)" strokeWidth="1.5" fill="none" strokeDasharray="2 3" />
    </svg>
  );
}

export function Enrica({ talking }: { talking: boolean }) {
  return (
    <svg className={`who-svg ${talking ? "talk" : ""}`} viewBox="0 0 120 130" role="img" aria-label="Enrica">
      <ellipse cx="60" cy="126" rx="34" ry="4" fill="rgba(90,67,48,.12)" />
      <path d="M30 70c-6 26-2 46 4 56h52c6-10 10-30 4-56Z" fill="#7a5a3c" />
      <path d="M22 128c2-26 16-38 38-38s36 12 38 38Z" fill="#a7b67f" stroke="#7d8c5a" strokeWidth="2" />
      <circle cx="60" cy="58" r="25" fill="#f3cdb0" />
      <path d="M34 60c-2-22 10-34 26-34s28 12 26 34c-4-12-12-20-26-20s-22 8-26 20Z" fill="#7a5a3c" />
      <circle cx="51" cy="60" r="3" fill="#3f2e22" />
      <circle cx="69" cy="60" r="3" fill="#3f2e22" />
      <circle cx="45" cy="68" r="4" fill="#f0a98e" opacity=".5" />
      <circle cx="75" cy="68" r="4" fill="#f0a98e" opacity=".5" />
      <ellipse className="mouth" cx="60" cy="72" rx="5" ry="2.2" fill="#b4574a" />
      <g transform="translate(78 30) rotate(18)">
        <ellipse cx="0" cy="0" rx="6" ry="4.5" fill="#f0c46e" stroke="#5a4330" strokeWidth="1.2" />
        <path d="M-2-4v8M2-4v8" stroke="#5a4330" strokeWidth="1.2" />
        <ellipse cx="-2" cy="-6" rx="4" ry="2.5" fill="rgba(255,255,255,.8)" />
      </g>
    </svg>
  );
}
