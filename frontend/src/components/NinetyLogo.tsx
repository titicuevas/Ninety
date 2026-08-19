import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
} as const;

export function NinetyLogo({
  size = 'sm',
  className,
  animate = false,
}: {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(SIZE_CLASS[size], animate && 'ninety-loader-mark', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="n-pitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#064e3b" />
          <stop offset="100%" stopColor="#0a0a0b" />
        </linearGradient>
        <radialGradient id="n-glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="512" height="512" rx="108" fill="url(#n-pitch)" />
      <rect width="512" height="512" rx="108" fill="url(#n-glow)" />

      {/* Borde del campo */}
      <rect x="32" y="32" width="448" height="448" rx="76" fill="none" stroke="#10b981" strokeWidth="5" opacity="0.3" />

      {/* Línea de medio campo */}
      <line x1="256" y1="72" x2="256" y2="440" stroke="#10b981" strokeWidth="4" opacity="0.22" />

      {/* Círculo central */}
      <circle cx="256" cy="256" r="72" fill="none" stroke="#10b981" strokeWidth="4" opacity="0.22" />
      <circle cx="256" cy="256" r="8" fill="#10b981" opacity="0.25" />

      {/* Áreas */}
      <rect x="164" y="32" width="184" height="80" rx="4" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.12" />
      <rect x="164" y="400" width="184" height="80" rx="4" fill="none" stroke="#10b981" strokeWidth="3" opacity="0.12" />

      {/* 90 */}
      <text
        x="256"
        y="290"
        textAnchor="middle"
        fill="#10b981"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="200"
        fontWeight="800"
        letterSpacing="-12"
      >
        90
      </text>

      {/* MIN */}
      <text
        x="256"
        y="348"
        textAnchor="middle"
        fill="#10b981"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize="28"
        fontWeight="600"
        letterSpacing="6"
        opacity="0.55"
      >
        MIN
      </text>
    </svg>
  );
}
