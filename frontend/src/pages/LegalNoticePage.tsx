import { Link } from 'react-router-dom';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CONTACT_EMAIL = 'hello@getninety.app';
const SITE = 'https://www.getninety.app';

export function LegalNoticePage() {
  useDocumentTitle('Aviso legal');
  return (
    <LegalPageLayout title="Aviso legal">
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
        Información general sobre el titular y el uso del sitio{' '}
        <a href={SITE} className="text-primary underline underline-offset-2">
          getninety.app
        </a>
        , de acuerdo con la normativa aplicable a servicios de la sociedad de la información.
      </p>

      <LegalSection title="1. Titular del servicio">
        <p>
          Ninety es un <strong className="text-foreground">proyecto independiente en fase beta</strong>,
          sin sociedad mercantil ni domicilio fiscal publicados en este aviso. El contacto operativo
          para comunicaciones legales o de privacidad es{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Nombre comercial:</strong> Ninety
          </li>
          <li>
            <strong className="text-foreground">Sitio web:</strong>{' '}
            <a href={SITE} className="text-primary underline underline-offset-2">
              {SITE}
            </a>
          </li>
          <li>
            <strong className="text-foreground">Email:</strong>{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Objeto">
        <p>
          El sitio ofrece un diario digital de partidos de fútbol (Capsules, estadísticas, listas y
          funciones sociales limitadas). El acceso y uso están sujetos a los{' '}
          <Link to="/terminos" className="text-primary underline underline-offset-2">
            Términos de uso
          </Link>{' '}
          y a la{' '}
          <Link to="/privacidad" className="text-primary underline underline-offset-2">
            Política de privacidad
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Propiedad intelectual">
        <p>
          El software, marca tipográfica, diseño y contenidos propios de Ninety están titularidad del
          proyecto o se usan bajo licencia. Los escudos, nombres de clubes y datos de competiciones
          pertenecen a sus respectivos titulares; Ninety no reivindica derechos sobre ellos.
        </p>
      </LegalSection>

      <LegalSection title="4. Responsabilidad">
        <p>
          Ninety se ofrece «tal cual» en beta. No garantizamos disponibilidad ininterrumpida ni la
          exactitud absoluta de datos de partidos de terceros. El uso del servicio es bajo tu propia
          responsabilidad, sin perjuicio de lo establecido en los términos.
        </p>
      </LegalSection>

      <LegalSection title="5. Enlaces">
        <p>
          Podemos enlazar a sitios de terceros (p. ej. autenticación con Google o proveedores de
          datos). No controlamos esos sitios ni su política; revisa sus avisos propios.
        </p>
      </LegalSection>

      <LegalSection title="6. Legislación">
        <p>
          Salvo norma imperativa en contrario, las relaciones derivadas del uso de getninety.app se
          interpretan conforme a la legislación española y europea aplicable a servicios digitales y
          protección de datos.
        </p>
      </LegalSection>

      <LegalSection title="7. Contacto">
        <p>
          Para cualquier consulta relacionada con este aviso:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
