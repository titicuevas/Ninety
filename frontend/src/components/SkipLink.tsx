export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(event) => {
        const main = document.getElementById('main-content');
        if (!main) return;
        // SPA: el hash solo no siempre mueve el foco; garantizar destino focusable.
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1');
        }
        // Evitar salto nativo duplicado; enfocamos tras el paint.
        event.preventDefault();
        main.focus({ preventScroll: false });
        main.scrollIntoView({ block: 'start' });
        const { pathname, search } = window.location;
        if (window.location.hash !== '#main-content') {
          window.history.replaceState(null, '', `${pathname}${search}#main-content`);
        }
      }}
    >
      Saltar al contenido
    </a>
  );
}
