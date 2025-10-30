import React from "react";

import { trackEvent } from "@/Utils";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Caught an error:", error, errorInfo);
    trackEvent("error", { error: error.message, errorInfo: JSON.stringify(errorInfo) });
  }

  render() {
    if (this.state.hasError) {
      // Render any custom fallback UI with the error message
      return (
        <div className="m-4 layer-1 text-xs font-mono overflow-auto">
          <h2>Something went wrong.</h2>
          <b>{this.state.error?.message}</b>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
