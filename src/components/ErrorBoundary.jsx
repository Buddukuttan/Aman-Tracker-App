import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical System Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-background p-10 text-center font-sans">
          <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500 mb-8">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-4">System Overload</h1>
          <p className="text-foreground/60 mb-8 max-w-xs mx-auto">
            The data engine encountered an unexpected state. This usually happens with complex financial calculations.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform"
          >
            <RefreshCcw className="w-5 h-5" />
            Reboot Interface
          </button>
          <pre className="mt-12 p-4 bg-foreground/5 rounded-xl text-[10px] text-foreground/40 max-w-xs overflow-auto">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
