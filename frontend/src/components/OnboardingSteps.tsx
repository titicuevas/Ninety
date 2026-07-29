import { Link } from 'react-router-dom';
import { Check, Search, Camera, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OnboardingStepsProps {
  hasProfile: boolean;
  hasCapsule: boolean;
  hasFollow: boolean;
}

const steps = [
  {
    key: 'search',
    icon: Search,
    title: 'Busca un partido',
    description: 'Encuentra el último partido que viste en directo o por TV.',
    link: '/search',
    linkLabel: 'Buscar',
  },
  {
    key: 'capsule',
    icon: Camera,
    title: 'Crea tu primera cápsula',
    description: 'Guarda la experiencia: fotos, nota y tu puntuación.',
    link: '/search',
    linkLabel: 'Crear cápsula',
  },
  {
    key: 'follow',
    icon: Users,
    title: 'Sigue a otros aficionados',
    description: 'Descubre qué partidos ven tus amigos.',
    link: '/search?tab=people',
    linkLabel: 'Buscar personas',
  },
] as const;

export function OnboardingSteps({ hasProfile, hasCapsule, hasFollow }: OnboardingStepsProps) {
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
            return (
              <li key={step.key}>
                <Link
                  to={done ? '#' : step.link}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 transition-colors',
                    done
                      ? 'pointer-events-none opacity-60'
                      : 'hover:bg-secondary/60',
                  )}
                  aria-disabled={done}
                >
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
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
