import { Link } from 'react-router-dom';
import { LegalPageLayout, LegalSection } from '@/components/LegalPageLayout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const CONTACT_EMAIL = 'hello@getninety.app';
const SITE = 'https://www.getninety.app';

export function PrivacyPage() {
  useDocumentTitle('Privacidad');
  return (
    <LegalPageLayout title="Política de privacidad">
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
        Esta política describe cómo Ninety (
        <a href={SITE} className="text-primary underline-offset-2 hover:underline">
          getninety.app
        </a>
        ) trata datos personales en la beta. Es un texto claro sobre el producto real, no un aviso
        corporativo inventado: Ninety es un proyecto independiente en fase beta, sin sociedad ni
        bufete asociados publicados aquí.
      </p>

      <LegalSection title="1. Quién opera el servicio">
        <p>
          El servicio se llama <strong className="text-foreground">Ninety</strong> y está disponible
          en <strong className="text-foreground">getninety.app</strong> (y el fallback de
          despliegue en Railway). Para consultas de privacidad o solicitudes sobre tus datos:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recogemos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Cuenta:</strong> email, nombre visible, nombre de
            usuario y datos de perfil opcionales (equipo favorito, país, ciudad, bio, avatar).
          </li>
          <li>
            <strong className="text-foreground">Contenido del diario:</strong> Capsules (partido,
            fecha, valoración, notas, fotos, contexto de visionado), colecciones y actividad social
            (likes, comentarios, follows) asociada a tu cuenta.
          </li>
          <li>
            <strong className="text-foreground">Técnicos:</strong> logs básicos de uso, IP aproximada
            y datos de sesión para autenticarte. La sesión vive en{' '}
            <code className="rounded bg-secondary px-1 py-0.5 text-foreground">localStorage</code> del
            navegador, no en cookies de marketing. No usamos analítica de terceros ni cookies de
            publicidad.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Qué es público y qué no (lo importante)">
        <p>
          Ninety es un diario social. Eso implica visibilidad por diseño, con matices:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Perfil:</strong> tu página{' '}
            <code className="rounded bg-secondary px-1 py-0.5 text-foreground">/u/usuario</code> es
            pública (nombre, stats y Capsules públicas).
          </li>
          <li>
            <strong className="text-foreground">Capsules:</strong> cada una puede ser{' '}
            <strong className="text-foreground">pública</strong> (visible sin login, enlaces{' '}
            <code className="rounded bg-secondary px-1 py-0.5 text-foreground">/c/…</code>, feed y
            perfil) o <strong className="text-foreground">privada</strong> (solo tú). El valor por
            defecto al crear es público; puedes cambiarlo al crear o editar.
          </li>
          <li>
            <strong className="text-foreground">Colecciones:</strong> también pueden ser públicas o
            privadas.
          </li>
        </ul>
        <p>
          No publiques datos sensibles (dirección, documentos, datos de menores, etc.) en notas o
          fotos. Lo que marques como público puede indexarse o compartirse fuera de Ninety.
        </p>
      </LegalSection>

      <LegalSection title="4. Para qué usamos tus datos">
        <ul className="list-disc space-y-2 pl-5">
          <li>Crear y gestionar tu cuenta.</li>
          <li>Guardar y mostrar tu diario, estadísticas y funciones de la beta.</li>
          <li>Mostrar actividad social (feed, follows, likes, comentarios) según la visibilidad.</li>
          <li>Mantener seguridad y estabilidad del servicio.</li>
        </ul>
        <p>No vendemos tus datos personales.</p>
      </LegalSection>

      <LegalSection title="5. Autenticación y proveedores">
        <p>Usamos estos servicios para operar Ninety:</p>
        <ul className="mt-1 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Supabase</strong> — autenticación (email/contraseña y
            Google OAuth), base de datos y almacenamiento.
          </li>
          <li>
            <strong className="text-foreground">Google</strong> — solo si eliges «Continuar con
            Google»; Google trata el login según su propia política.
          </li>
          <li>
            <strong className="text-foreground">Railway</strong> — alojamiento de la app.
          </li>
          <li>
            <strong className="text-foreground">football-data.org</strong> — datos públicos de
            partidos (no son datos personales tuyos).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Exportar y eliminar">
        <p>
          Puedes <strong className="text-foreground">exportar tu diario</strong> (Capsules en JSON o
          CSV) e <strong className="text-foreground">importarlo</strong> desde un export JSON en{' '}
          <Link to="/settings" className="text-primary underline-offset-2 hover:underline">Ajustes</Link>
          . El export no incluye contraseñas ni tokens; las colecciones no van en ese archivo.
        </p>
        <p>
          Para eliminar la cuenta, hoy el flujo es manual: desde Ajustes se abre un email a{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
          . Conservamos los datos mientras la cuenta exista; al borrarla dejamos de usarlos salvo
          obligaciones legales mínimas o copias de seguridad técnicas con retención corta.
        </p>
      </LegalSection>

      <LegalSection title="7. Tus derechos">
        <p>
          Puedes acceder y corregir datos de perfil en la app, exportar el diario y solicitar
          borrado por email. Si la normativa aplicable te otorga más derechos (oposición,
          limitación, etc.), escríbenos y los atenderemos en la medida en que el producto y la ley
          lo permitan. No afirmamos aquí una jurisdicción ni un DPO inventados.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios">
        <p>
          Podemos actualizar esta política. La versión vigente estará en esta página con la fecha de
          revisión. Los{' '}
          <Link to="/terminos" className="text-primary underline-offset-2 hover:underline">
            Términos de uso
          </Link>{' '}
          son un documento aparte.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
