import { LegalPageLayout } from '@/components/LegalPageLayout';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Política de privacidad">
      <p>
        En Ninety tratamos tus datos con cuidado. Esta política explica qué información recogemos, para qué la
        usamos y qué derechos tienes. Al usar la app aceptas estas condiciones.
      </p>

      <Section title="1. Responsable">
        <p>
          Ninety es un proyecto en fase beta. Para consultas sobre privacidad puedes escribir a{' '}
          <a href="mailto:hello@ninety.app" className="text-primary hover:underline">
            hello@ninety.app
          </a>
          .
        </p>
      </Section>

      <Section title="2. Datos que recogemos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Cuenta:</strong> email, nombre visible, nombre de usuario y datos de
            perfil opcionales (equipo favorito, país, ciudad).
          </li>
          <li>
            <strong className="text-foreground">Contenido:</strong> Capsules que creas (partidos, fechas, valoraciones,
            notas, fotos) y actividad en el feed.
          </li>
          <li>
            <strong className="text-foreground">Técnicos:</strong> logs básicos de uso, dirección IP aproximada y datos
            de sesión necesarios para mantener la cuenta segura. La sesión se guarda en el almacenamiento local del
            navegador (<code className="text-foreground">localStorage</code>), no en cookies de seguimiento. No usamos
            cookies de marketing ni analítica de terceros.
          </li>
        </ul>
      </Section>

      <Section title="2.1. Contenido público">
        <p>
          Ninety funciona como un diario social: tu perfil (<code className="text-foreground">/u/usuario</code>) y tus
          Capsules son <strong className="text-foreground">públicos</strong> y pueden verse sin iniciar sesión,
          también mediante enlaces compartibles (<code className="text-foreground">/c/…</code>). No publiques datos
          personales sensibles en notas o fotos.
        </p>
      </Section>

      <Section title="3. Para qué usamos tus datos">
        <ul className="list-disc space-y-1 pl-5">
          <li>Crear y gestionar tu cuenta.</li>
          <li>Guardar y mostrar tus Capsules y estadísticas.</li>
          <li>Mostrar actividad en el feed social de la beta.</li>
          <li>Mejorar la estabilidad y seguridad del servicio.</li>
        </ul>
        <p className="mt-2">No vendemos tus datos personales a terceros.</p>
      </Section>

      <Section title="4. Servicios de terceros">
        <p>Usamos proveedores para operar Ninety:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="text-foreground">Supabase</strong> — autenticación y base de datos.
          </li>
          <li>
            <strong className="text-foreground">Railway</strong> — alojamiento de la aplicación.
          </li>
          <li>
            <strong className="text-foreground">football-data.org</strong> — datos públicos de partidos (no incluyen
            información personal tuya).
          </li>
        </ul>
      </Section>

      <Section title="5. Conservación y seguridad">
        <p>
          Conservamos tus datos mientras mantengas la cuenta activa. Puedes solicitar la eliminación escribiéndonos.
          Aplicamos medidas razonables de seguridad, aunque ningún servicio en internet es 100 % infalible.
        </p>
      </Section>

      <Section title="6. Tus derechos">
        <p>
          Puedes acceder, corregir o eliminar tus datos desde tu perfil o contactándonos. También puedes oponerte al
          tratamiento o solicitar la portabilidad cuando la ley lo permita.
        </p>
      </Section>

      <Section title="7. Cambios">
        <p>
          Podemos actualizar esta política. Publicaremos la nueva versión en esta página con la fecha de revisión.
        </p>
      </Section>
    </LegalPageLayout>
  );
}
