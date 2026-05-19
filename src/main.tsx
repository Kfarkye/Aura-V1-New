console.log('--- AURA CLIENT BOOTSTRAP START ---');
// MUST be first import — initializes Firebase before any component uses getAuth()
import './lib/firebase-init';
import { StrictMode, useState, useEffect, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import LandingPage from './components/pages/LandingPage.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import './index.css';

// ── Global error surface — catch ANY crash and show it instead of white screen ──
window.onerror = (msg, src, line, col, err) => {
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    root.innerHTML = `<pre style="padding:2rem;color:red;font-size:14px;white-space:pre-wrap">RUNTIME ERROR:\n${msg}\n\nSource: ${src}:${line}:${col}\n\nStack:\n${err?.stack || 'N/A'}</pre>`;
  }
};
window.onunhandledrejection = (e: PromiseRejectionEvent) => {
  const root = document.getElementById('root');
  if (root && !root.innerHTML) {
    root.innerHTML = `<pre style="padding:2rem;color:red;font-size:14px;white-space:pre-wrap">UNHANDLED REJECTION:\n${e.reason}\n\nStack:\n${e.reason?.stack || 'N/A'}</pre>`;
  }
};

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: '2rem', color: 'red', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
          {'REACT ERROR BOUNDARY:\n' + this.state.error.message + '\n\nStack:\n' + this.state.error.stack}
        </pre>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Client-side Router
 * - / renders public LandingPage (no auth required)
 * - /app renders App wrapped in AuthGate (Firebase auth required)
 * - Unknown routes redirect to /
 */
const Router = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToApp = () => {
    window.history.pushState({}, '', '/app');
    setCurrentPath('/app');
  };

  // Public landing page — no auth required
  if (currentPath === '/') {
    return <LandingPage onNavigateToApp={navigateToApp} />;
  }

  // Protected app shell — Firebase auth required
  if (currentPath === '/app' || currentPath.startsWith('/app/')) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <App />
        </AuthGate>
      </QueryClientProvider>
    );
  }

  // Unknown route — redirect to landing
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/');
  }
  return <LandingPage onNavigateToApp={navigateToApp} />;
};

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <Router />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (err: any) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<pre style="padding:2rem;color:red;font-size:14px;white-space:pre-wrap">MOUNT CRASH:\n${err.message}\n\nStack:\n${err.stack}</pre>`;
  }
}
