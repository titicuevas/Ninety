import { Link } from 'react-router-dom';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CONTACT_EMAIL = 'hello@getninety.app';
const SITE = 'https://www.getninety.app';

export function TermsPage() {
  useDocumentTitle('Términos');
  return (
    <LegalPageLayout title="Términos de uso">
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
        Al registrarte o usar Ninety (
        <a href={SITE} className="text-primary underline-offset-2 hover:underline">
          getninety.app
        </a>
        ) aceptas estos términos. Si no estás de acuerdo, no uses el servicio. Ninety es un proyecto
        en beta: no hay sociedad mercantil ni bufete listados aquí; el contacto operativo es el
        email de abajo.
      </p>

      <LegalSection title="1. Qué es Ninety">
        <p>
          Ninety es un diario digital de partidos de fútbol. Puedes registrar partidos vistos
          («Capsules»), estadísticas, colecciones, un feed social limitado y funciones de
          retención (resúmenes on-device en el dispositivo). El servicio está en fase beta y puede
          cambiar.
        </p>
      </LegalSection>

      <LegalSection title="2. Cuenta y acceso">
        <ul className="list-disc space-y-2 pl-5">
          <li>Debes proporcionar información veraz al registrarte.</li>
          <li>
            Puedes entrar con email/contraseña o con Google. La autenticación la gestiona{' '}
            <strong className="text-foreground">Supabase</strong> (y Google si eliges OAuth).
          </li>
          <li>Eres responsable de tu contraseña y de la actividad en tu cuenta.</li>
          <li>No está permitido suplantar a otras personas ni crear cuentas automatizadas abusivas.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Uso aceptable">
        <p>No puedes usar Ninety para:</p>
        <ul className="mt-1 list-disc space-y-2 pl-5">
          <li>Publicar contenido ilegal, ofensivo o que infrinja derechos de terceros.</li>
          <li>Intentar acceder sin autorización a sistemas o datos de otros usuarios.</li>
          <li>Abusar de la API o sobrecargar el servicio de forma intencionada.</li>
        </ul>
        <p>Podemos suspender cuentas que incumplan estas normas.</p>
      </LegalSection>

      <LegalSection title="4. Contenido y visibilidad">
        <p>
          Conservas los derechos sobre tus Capsules, notas y fotos. Al publicar contenido{' '}
          <strong className="text-foreground">público</strong> en Ninety nos concedes una licencia
          no exclusiva para mostrarlo en la app y en páginas públicas (perfil, feed y enlaces{' '}
          <code className="rounded bg-secondary px-1 py-0.5 text-foreground">/c/…</code>).
        </p>
        <p>
          Las Capsules y colecciones pueden ser <strong className="text-foreground">públicas</strong>{' '}
          o <strong className="text-foreground">privadas</strong>. Lo privado no se ofrece como
          enlace público; lo público puede verse sin cuenta. Detalles en la{' '}
          <Link to="/privacidad" className="text-primary underline-offset-2 hover:underline">
            Política de privacidad
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="5. Exportación y baja">
        <p>
          Puedes exportar tus Capsules (JSON/CSV) desde Ajustes. La eliminación de cuenta en la beta
          se solicita por email a{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          (aún no hay borrado automático instantáneo en la app).
        </p>
      </LegalSection>

      <LegalSection title="6. Beta y disponibilidad">
        <p>
          Ninety se ofrece «tal cual» durante la beta: pueden existir errores, cambios de
          funcionalidad o interrupciones. No garantizamos disponibilidad continua ni resultados
          concretos.
        </p>
      </LegalSection>

      <LegalSection title="7. Datos de partidos">
        <p>
          La información de partidos proviene de fuentes externas (p. ej. football-data.org). No
          garantizamos que esté siempre completa, actualizada o libre de errores.
        </p>
      </LegalSection>

      <LegalSection title="8. Limitación de responsabilidad">
        <p>
          En la medida permitida por la ley aplicable, Ninety no será responsable de daños
          indirectos derivados del uso de la aplicación durante la beta. No fijamos aquí un tribunal
          ni una ley nacional inventada; si surge un conflicto, se aplicará lo que corresponda según
          tu relación con el servicio y la normativa vigente.
        </p>
      </LegalSection>

      <LegalSection title="9. Cambios y contacto">
        <p>
          Podemos modificar estos términos. El uso continuado tras publicar cambios en esta página
          implica su aceptación. Dudas:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
