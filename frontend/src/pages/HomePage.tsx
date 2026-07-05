import { Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuthInit';

export function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const metadataName =
    typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : undefined;
  const name = profile?.display_name ?? metadataName ?? 'Aficionado';

  return (
    <Layout>
      <div className="space-y-8">
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hola, {name} 👋</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Tu diario futbolero está listo. Próximamente podrás buscar partidos y crear Capsules.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { label: 'Partidos vistos', value: '0' },
            { label: 'Capsules', value: '0' },
            { label: 'Valoración media', value: '—' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-dashed">
          <CardContent className="p-6 text-center sm:p-8">
            <p className="text-lg font-medium">Aún no tienes Capsules</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Busca un partido y guarda tu primer recuerdo futbolero.
            </p>
            <Button asChild className="mt-4">
              <Link to="/search">Buscar partido</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
