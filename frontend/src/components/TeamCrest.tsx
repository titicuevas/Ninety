import { teamInitials } from '@/lib/teamCrest';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-[10px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm sm:h-14 sm:w-14',
} as const;

const SIZE_PX = {
  sm: 32,
  md: 40,
  lg: 56,
} as const;

export function TeamCrest({
  name,
  crest,
  size = 'sm',
  className,
}: {
  name: string;
  crest?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const box = cn(
    'flex shrink-0 items-center justify-center',
    SIZE_CLASS[size],
    className,
  );

  if (!crest) {
    return (
      <span
        className={cn(box, 'rounded-full bg-muted font-semibold text-muted-foreground')}
        aria-hidden
      >
        {teamInitials(name)}
      </span>
    );
  }

  return (
    <img
      src={crest}
      alt=""
      width={SIZE_PX[size]}
      height={SIZE_PX[size]}
      className={cn(box, 'object-contain')}
      loading="lazy"
    />
  );
}
