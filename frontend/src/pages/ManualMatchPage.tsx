import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import { MatchCard } from '@/components/MatchCard';
import { WantToGoButton } from '@/components/WantToGoButton';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { buildManualFootballMatch } from '@/lib/manualMatch';
import { saveDraftMatch } from '@/lib/draftMatch';

const manualMatchFormSchema = z
  .object({
    homeTeam: z.string().trim().min(1, 'Indica el equipo local').max(80),
    awayTeam: z.string().trim().min(1, 'Indica el equipo visitante').max(80),
    playedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa una fecha válida'),
    competition: z.string().trim().max(80).optional(),
    homeScore: z.string().optional(),
    awayScore: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const home = data.homeTeam.trim().toLocaleLowerCase('es');
    const away = data.awayTeam.trim().toLocaleLowerCase('es');
    if (home && away && home === away) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Local y visitante deben ser distintos',
        path: ['awayTeam'],
      });
    }

    const hs = data.homeScore?.trim() ?? '';
    const as = data.awayScore?.trim() ?? '';
    if ((hs === '') !== (as === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indica ambos marcadores o déjalos vacíos',
        path: ['awayScore'],
      });
      return;
    }
    if (hs !== '') {
      const hn = Number(hs);
      const an = Number(as);
      if (!Number.isInteger(hn) || hn < 0 || hn > 99) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Marcador entre 0 y 99',
          path: ['homeScore'],
        });
      }
      if (!Number.isInteger(an) || an < 0 || an > 99) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Marcador entre 0 y 99',
          path: ['awayScore'],
        });
      }
    }
  });

type ManualMatchForm = z.infer<typeof manualMatchFormSchema>;

function parseOptionalScore(raw: string | undefined): number | null {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return null;
  return Number(trimmed);
}

export function ManualMatchPage() {
  useDocumentTitle('Partido manual');
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ManualMatchForm>({
    resolver: zodResolver(manualMatchFormSchema),
    mode: 'onChange',
    defaultValues: {
      homeTeam: '',
      awayTeam: '',
      playedAt: new Date().toISOString().slice(0, 10),
      competition: '',
      homeScore: '',
      awayScore: '',
    },
  });

  const values = watch();
  const preview =
    values.homeTeam?.trim() && values.awayTeam?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(values.playedAt ?? '')
      ? buildManualFootballMatch({
          homeTeam: values.homeTeam,
          awayTeam: values.awayTeam,
          playedAt: values.playedAt,
          competition: values.competition || null,
          homeScore: parseOptionalScore(values.homeScore),
          awayScore: parseOptionalScore(values.awayScore),
        })
      : null;

  const onSubmit = (data: ManualMatchForm) => {
    const match = buildManualFootballMatch({
      homeTeam: data.homeTeam,
      awayTeam: data.awayTeam,
      playedAt: data.playedAt,
      competition: data.competition || null,
      homeScore: parseOptionalScore(data.homeScore),
      awayScore: parseOptionalScore(data.awayScore),
    });
    saveDraftMatch(match);
    navigate('/capsules/new', { state: { match } });
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md space-y-6 pb-10 md:max-w-lg">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Ninety</p>
          <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-3xl">
            Partido manual
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Si el catálogo no tiene el partido (amistoso, local, torneo…), añádelo tú y sigue con tu
            Capsule.
          </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Equipo local" error={errors.homeTeam?.message}>
            <Input
              autoComplete="off"
              placeholder="Ej. Betis"
              aria-invalid={!!errors.homeTeam}
              {...register('homeTeam')}
            />
          </FormField>

          <FormField label="Equipo visitante" error={errors.awayTeam?.message}>
            <Input
              autoComplete="off"
              placeholder="Ej. Sevilla"
              aria-invalid={!!errors.awayTeam}
              {...register('awayTeam')}
            />
          </FormField>

          <FormField label="Fecha del partido" error={errors.playedAt?.message}>
            <Input type="date" aria-invalid={!!errors.playedAt} {...register('playedAt')} />
          </FormField>

          <FormField label="Competición (opcional)" error={errors.competition?.message}>
            <Input
              autoComplete="off"
              placeholder="Ej. Amistoso, Copa local…"
              {...register('competition')}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-home-score">Goles local</Label>
              <Input
                id="manual-home-score"
                inputMode="numeric"
                placeholder="—"
                aria-invalid={!!errors.homeScore}
                {...register('homeScore')}
              />
              {errors.homeScore?.message ? (
                <p className="text-xs text-destructive">{errors.homeScore.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-away-score">Goles visitante</Label>
              <Input
                id="manual-away-score"
                inputMode="numeric"
                placeholder="—"
                aria-invalid={!!errors.awayScore}
                {...register('awayScore')}
              />
              {errors.awayScore?.message ? (
                <p className="text-xs text-destructive">{errors.awayScore.message}</p>
              ) : null}
            </div>
          </div>

          {preview ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vista previa
              </p>
              <MatchCard match={preview} />
              <WantToGoButton match={preview} />
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
            <Button type="submit" className="h-11 w-full sm:w-auto" disabled={!isValid}>
              Continuar a Capsule
            </Button>
            <Button asChild type="button" variant="secondary" className="h-11 w-full sm:w-auto">
              <Link to="/search">Volver a buscar</Link>
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
