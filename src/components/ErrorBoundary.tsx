import React, { Component, ErrorInfo, ReactNode } from 'react';
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-neutral-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0e0e0e] border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl">

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
              <p className="text-sm text-neutral-400 leading-relaxed">
                An unexpected issue occurred while rendering the page. Don't worry, your saved bookmarks are intact.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm rounded-full shadow-lg shadow-rose-900/30 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true" className="hidden" />
                <span>Return to Home</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-semibold text-sm rounded-full transition-colors flex items-center gap-2 cursor-pointer"
              >
                <span aria-hidden="true" className="hidden" />
                <span>Reload</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
