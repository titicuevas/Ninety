import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

type RootErrorFallbackProps = {
  error: unknown;
};

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim();
  if (error instanceof Error) return error.message;
  return 'Error inesperado';
}

export function RootErrorFallback({ error }: RootErrorFallbackProps) {
  return (
    <div className="root-error-boundary">
      <h1 className="root-error-title">Algo falló al cargar Ninety</h1>
      <pre className="root-error-pre">{errorMessage(error)}</pre>
      <button type="button" className="root-error-reload" onClick={() => window.location.reload()}>
        Recargar
      </button>
    </div>
  );
}

export function RouteErrorFallback() {
  return <RootErrorFallback error={useRouteError()} />;
}
