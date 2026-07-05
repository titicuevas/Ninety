type Props = {
  className?: string;
};

/** Ilustración del estadio en obras — inline para evitar fallos de carga y fondo invisible. */
export function UnderConstructionIllustration({ className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 500"
      fill="none"
      role="img"
      aria-label="Estadio de fútbol en obras"
      className={className}
    >
      <defs>
        <linearGradient id="ninety-pitch" x1="200" y1="280" x2="600" y2="380">
          <stop stopColor="#166534" />
          <stop offset="1" stopColor="#052e16" />
        </linearGradient>
        <linearGradient id="ninety-beam" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>

      <ellipse cx="400" cy="420" rx="340" ry="80" fill="#10b981" opacity="0.12" />

      <path d="M60 360 Q400 120 740 360" stroke="#71717a" strokeWidth="3" fill="none" />
      <path
        d="M120 340 Q400 180 680 340"
        stroke="#a1a1aa"
        strokeWidth="2"
        strokeDasharray="10 8"
        fill="none"
      />

      <rect x="580" y="130" width="8" height="210" fill="url(#ninety-beam)" />
      <rect x="420" y="130" width="168" height="8" fill="url(#ninety-beam)" />
      <line x1="588" y1="138" x2="588" y2="110" stroke="#fbbf24" strokeWidth="3" />
      <line x1="588" y1="110" x2="640" y2="110" stroke="#fbbf24" strokeWidth="3" />
      <line x1="640" y1="110" x2="640" y2="160" stroke="#d4d4d8" strokeWidth="2" />
      <rect x="632" y="160" width="16" height="12" rx="2" fill="#d4d4d8" />

      <ellipse cx="400" cy="390" rx="280" ry="70" fill="url(#ninety-pitch)" />
      <ellipse cx="400" cy="390" rx="280" ry="70" stroke="#22c55e" strokeWidth="2" opacity="0.7" />
      <circle cx="400" cy="390" r="36" stroke="#4ade80" strokeWidth="2" opacity="0.8" />
      <line x1="400" y1="320" x2="400" y2="460" stroke="#4ade80" strokeWidth="2" opacity="0.5" />

      <polygon points="220,400 230,378 240,400" fill="#f97316" />
      <polygon points="255,408 265,386 275,408" fill="#f97316" />
      <circle cx="400" cy="375" r="18" fill="#fafafa" />
      <path d="M400 360 L408 372 L400 384 L392 372 Z" fill="#18181b" />
      <path d="M400 360 L415 368 L408 384 L392 376 Z" fill="#27272a" opacity="0.6" />

      <rect x="300" y="200" width="200" height="72" rx="10" fill="#18181b" stroke="#10b981" strokeWidth="2" />
      <text
        x="400"
        y="232"
        textAnchor="middle"
        fill="#10b981"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="3"
      >
        EN OBRAS
      </text>
      <text
        x="400"
        y="256"
        textAnchor="middle"
        fill="#d4d4d8"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="11"
      >
        Pronto abrimos el estadio
      </text>

      <rect x="368" y="48" width="64" height="64" rx="14" fill="#10b981" />
      <text
        x="400"
        y="92"
        textAnchor="middle"
        fill="#052e16"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="28"
        fontWeight="800"
      >
        90
      </text>
    </svg>
  );
}
