import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
  componentStack?: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: undefined };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary caught:', error, info);
    this.setState({ componentStack: info?.componentStack });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Ocurrió un error en la interfaz</h1>
          <p className="text-gray-700 mb-4">{this.state.message || 'Intenta nuevamente.'}</p>
          {this.state.componentStack && (
            <pre className="text-left bg-gray-100 p-3 rounded border text-xs max-w-3xl whitespace-pre-wrap mb-4">
              {this.state.componentStack.trim()}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
