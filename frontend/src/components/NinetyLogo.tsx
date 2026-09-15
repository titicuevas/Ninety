import { useId } from 'react';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  xs: 'h-7 w-7',
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
} as const;

/** Mark de Ninety (N estilizada). */
export function NinetyLogo({
  size = 'sm',
  className,
  animate = false,
}: {
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  animate?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const bgId = `n-mark-bg-${uid}`;
  const strokeId = `n-mark-stroke-${uid}`;

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', SIZE_CLASS[size], animate && 'ninety-loader-mark', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#053b2d" />
          <stop offset="100%" stopColor="#0a0a0b" />
        </linearGradient>
        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="112" fill={`url(#${bgId})`} />
      <rect
        x="30"
        y="30"
        width="452"
        height="452"
        rx="82"
        fill="none"
        stroke={`url(#${strokeId})`}
        strokeWidth="10"
        opacity="0.35"
      />

      <path d="M156 362V150h54l92 111V150h54v212h-50l-96-117v117z" fill={`url(#${strokeId})`} />
      <path d="M166 386h180" stroke="#10b981" strokeWidth="12" strokeLinecap="round" opacity="0.45" />
      <circle cx="380" cy="142" r="26" fill="#10b981" opacity="0.16" />
    </svg>
  );
}
