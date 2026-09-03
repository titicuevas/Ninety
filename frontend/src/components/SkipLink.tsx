export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={() => {
        const main = document.getElementById('main-content');
        if (!main) return;
        // SPA: el hash solo no siempre mueve el foco; garantizar destino focusable.
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1');
        }
        main.focus({ preventScroll: false });
      }}
    >
      Saltar al contenido
    </a>
  );
}
