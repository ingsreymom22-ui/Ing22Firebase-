import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-8">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Something went wrong.</h1>
          <p className="text-slate-300 mb-6 text-center max-w-xl">
            An error occurred while rendering this page.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg overflow-auto max-w-full text-left">
            <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-full font-semibold transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
