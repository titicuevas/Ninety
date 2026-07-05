import { LegalPageLayout } from '@/components/LegalPageLayout';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function TermsPage() {
  return (
    <LegalPageLayout title="Términos de uso">
      <p>
        Bienvenido a Ninety. Al registrarte o usar la aplicación aceptas estos términos. Si no estás de acuerdo, no
        uses el servicio.
      </p>

      <Section title="1. Qué es Ninety">
        <p>
          Ninety es un diario digital de partidos de fútbol en fase beta. Permite registrar partidos vistos
          (&quot;Capsules&quot;), ver estadísticas básicas y compartir actividad en un feed social limitado.
        </p>
      </Section>

      <Section title="2. Cuenta y elegibilidad">
        <ul className="list-disc space-y-1 pl-5">
          <li>Debes proporcionar información veraz al registrarte.</li>
          <li>Eres responsable de mantener tu contraseña segura.</li>
          <li>No está permitido suplantar a otras personas ni crear cuentas automatizadas.</li>
        </ul>
      </Section>

      <Section title="3. Uso aceptable">
        <p>No puedes usar Ninety para:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Publicar contenido ilegal, ofensivo o que infrinja derechos de terceros.</li>
          <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios.</li>
          <li>Abusar de la API o sobrecargar el servicio de forma intencionada.</li>
        </ul>
        <p className="mt-2">
          Nos reservamos el derecho de suspender cuentas que incumplan estas normas.
        </p>
      </Section>

      <Section title="4. Contenido que publicas">
        <p>
          Conservas los derechos sobre tus Capsules y notas. Al publicar en Ninety nos concedes una licencia no
          exclusiva para mostrar ese contenido dentro de la app (por ejemplo, en tu feed o perfil).
        </p>
      </Section>

      <Section title="5. Beta y disponibilidad">
        <p>
          Ninety está en beta: pueden existir errores, cambios de funcionalidad o interrupciones temporales. El
          servicio se ofrece &quot;tal cual&quot;, sin garantías de disponibilidad continua.
        </p>
      </Section>

      <Section title="6. Datos de partidos">
        <p>
          La información de partidos proviene de fuentes externas (football-data.org). No garantizamos que esté
          siempre completa, actualizada o libre de errores.
        </p>
      </Section>

      <Section title="7. Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley, Ninety no será responsable de daños indirectos derivados del uso de la
          aplicación durante la fase beta.
        </p>
      </Section>

      <Section title="8. Cambios y contacto">
        <p>
          Podemos modificar estos términos. El uso continuado tras los cambios implica su aceptación. Dudas:{' '}
          <a href="mailto:hello@ninety.app" className="text-primary hover:underline">
            hello@ninety.app
          </a>
          .
        </p>
      </Section>
    </LegalPageLayout>
  );
}
