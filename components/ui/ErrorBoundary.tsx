import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State { hasError: boolean; error?: Error; }

// Catches render-time errors so a single broken component never blanks the whole app.
// Base is cast to `any` because this project intentionally ships without @types/react.
class ErrorBoundary extends (React.Component as any) {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    const { hasError, error } = this.state as State;
    if (hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="card max-w-md w-full p-8 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={28} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-6">
              The screen hit an unexpected error. Your data is safe — reloading usually fixes it.
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary w-full">
              <RefreshCw size={16} /> Reload
            </button>
            {error && (
              <p className="mt-4 text-[11px] font-mono text-slate-400 break-words">{error.message}</p>
            )}
          </div>
        </div>
      );
    }
    return (this.props as any).children;
  }
}

export default ErrorBoundary;
