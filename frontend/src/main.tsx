import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ninety render error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fafafa', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1 style={{ color: '#f87171' }}>Algo falló al cargar Ninety</h1>
          <pre style={{ marginTop: '1rem', color: '#a1a1aa', whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem',
              border: 0,
              borderRadius: 8,
              background: '#10b981',
              color: '#0a0a0b',
              fontWeight: 600,
              padding: '0.65rem 1rem',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
