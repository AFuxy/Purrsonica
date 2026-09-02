import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { initDevToolsConsole } from './utils/devToolsConsole.js';
import './index.css';

// Initialize window.purrsonica console API for Developer Mode
initDevToolsConsole();

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Purrsonica RootErrorBoundary] Uncaught application error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = () => {
    try {
      localStorage.removeItem('purrsonica:dj_deck_store');
      localStorage.removeItem('purrsonica_player_session');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#0f0f13] text-[#f3f4f6] flex flex-col items-center justify-center p-6 font-sans select-none">
          <div className="max-w-md w-full bg-[#18181f] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-lg">
                !
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Renderer Recovery</h1>
                <p className="text-xs text-neutral-400">Purrsonica encountered an unexpected error</p>
              </div>
            </div>

            <div className="p-3 bg-[#0d0d12] rounded-xl border border-neutral-800 text-xs font-mono text-red-300 max-h-40 overflow-y-auto break-words leading-relaxed">
              {this.state.error?.message || 'Unknown render error'}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Reload App
              </button>
              <button
                onClick={this.handleResetStorage}
                className="py-2 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                title="Clears cached session data and reloads"
              >
                Reset Session & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
