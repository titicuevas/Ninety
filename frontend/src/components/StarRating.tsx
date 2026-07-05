import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeClass = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
} as const;

export function StarRating({
  rating,
  size = 'md',
  className,
}: {
  rating: number;
  size?: keyof typeof sizeClass;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-0.5 text-primary', className)} aria-hidden>
      {[1, 2, 3, 4, 5]
        .filter((star) => star <= rating)
        .map((star) => (
          <Star key={star} className={cn(sizeClass[size], 'fill-current')} />
        ))}
    </div>
  );
}
