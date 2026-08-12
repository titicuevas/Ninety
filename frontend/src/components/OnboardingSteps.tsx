import { Link } from 'react-router-dom';
import { Check, User, Camera, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OnboardingStepsProps {
  hasProfile: boolean;
  hasCapsule: boolean;
  hasFollow: boolean;
  /** Cuando el claim de perfil está en la misma página (Home), no mandar a /profile. */
  profileClaimInline?: boolean;
}

const steps = [
  {
    key: 'profile',
    icon: User,
    title: 'Completa tu perfil',
    description: 'Nombre y username para que otros te reconozcan en el feed.',
    link: '/profile',
    inlineHash: '#claim-profile',
  },
  {
    key: 'capsule',
    icon: Camera,
    title: 'Crea tu primera cápsula',
    description: 'Busca un partido y guarda la experiencia: fotos, nota y puntuación.',
    link: '/search',
  },
  {
    key: 'follow',
    icon: Users,
    title: 'Sigue a otros aficionados',
    description: 'Descubre sugerencias o busca por username para llenar tu feed.',
    link: '/search?tab=people',
  },
] as const;

export function OnboardingSteps({
  hasProfile,
  hasCapsule,
  hasFollow,
  profileClaimInline = false,
}: OnboardingStepsProps) {
  const completed = [hasProfile, hasCapsule, hasFollow];
  const allDone = completed.every(Boolean);

  if (allDone) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 sm:p-6">
        <h2 className="text-base font-semibold sm:text-lg">Primeros pasos</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Completa estos pasos para sacarle el máximo a Ninety.
        </p>
        <ol className="mt-4 space-y-3">
          {steps.map((step, i) => {
            const done = completed[i];
            const Icon = step.icon;
            const href =
              step.key === 'profile' && profileClaimInline && 'inlineHash' in step
                ? step.inlineHash
                : step.link;
            const body = (
              <>
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', done && 'line-through')}>{step.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {step.key === 'profile' && profileClaimInline && !done
                      ? 'Usa el formulario de arriba o abre el editor en Perfil.'
                      : step.description}
                  </p>
                </div>
              </>
            );
            return (
              <li key={step.key}>
                {done ? (
                  <div className="flex items-start gap-3 rounded-lg p-3 opacity-60">{body}</div>
                ) : (
                  <Link
                    to={href}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-secondary/60"
                  >
                    {body}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
