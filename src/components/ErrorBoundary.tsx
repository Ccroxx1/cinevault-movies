import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Home, RefreshCw } from 'lucide-react';
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
        <div className="min-h-screen cv-shell flex items-center justify-center p-4">
          <div className="max-w-md w-full cv-surface-elevated border rounded-3xl p-8 text-center space-y-6">

            <div className="space-y-2">
              <h2 className="text-xl font-bold cv-text">Something went wrong</h2>
              <p className="text-sm cv-text-muted leading-relaxed">
                An unexpected issue occurred while rendering the page. Don't worry, your saved bookmarks are intact.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-6 py-2.5 cv-btn-primary font-semibold text-sm rounded-full shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 cv-btn-secondary font-semibold text-sm rounded-full transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
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
