import {
  Camera,
  Flame,
  Landmark,
  Layers,
  PenLine,
  Star,
  Ticket,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AchievementIcon, AchievementResult } from '@/lib/achievements';
import { countUnlockedAchievements } from '@/lib/achievements';

const ICONS: Record<AchievementIcon, LucideIcon> = {
  ticket: Ticket,
  flame: Flame,
  star: Star,
  landmark: Landmark,
  camera: Camera,
  pen: PenLine,
  layers: Layers,
  userPlus: UserPlus,
  users: Users,
};

type AchievementsSectionProps = {
  achievements: AchievementResult[];
  /** Título de sección (Home vs perfil público). */
  title?: string;
  /** Texto auxiliar bajo el título. */
  subtitle?: string;
  className?: string;
};

export function AchievementsSection({
  achievements,
  title = 'Logros',
  subtitle,
  className,
}: AchievementsSectionProps) {
  if (achievements.length === 0) return null;

  const unlocked = countUnlockedAchievements(achievements);
  const total = achievements.length;
  const headingId = 'achievements-heading';

  return (
    <section className={cn('space-y-4', className)} aria-labelledby={headingId}>
      <div>
        <h2 id={headingId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {subtitle ??
            (unlocked === 0
              ? `0 de ${total} desbloqueados — sigue llenando tu diario`
              : `${unlocked} de ${total} desbloqueados`)}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {achievements.map((achievement) => {
          const Icon = ICONS[achievement.icon];
          const progressLabel = achievement.unlocked
            ? achievement.description
            : `${Math.min(achievement.progress, achievement.threshold)} / ${achievement.threshold}`;

          return (
            <li
              key={achievement.id}
              className={cn(
                'flex items-center gap-3',
                !achievement.unlocked && 'opacity-45',
              )}
              data-unlocked={achievement.unlocked ? 'true' : 'false'}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  achievement.unlocked
                    ? 'bg-primary/15 text-primary'
                    : 'bg-secondary text-muted-foreground',
                )}
                aria-hidden="true"
              >
                <Icon className="h-[1.125rem] w-[1.125rem]" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium leading-snug">{achievement.title}</p>
                <p className="truncate text-xs text-muted-foreground">{progressLabel}</p>
              </div>
              <span className="sr-only">
                {achievement.unlocked ? 'Desbloqueado' : 'Bloqueado'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
