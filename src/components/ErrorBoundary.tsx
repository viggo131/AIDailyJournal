import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center gap-4">
          <h2 className="font-display text-xl text-text">Something went wrong</h2>
          <p className="text-text-soft text-sm max-w-xs">
            An unexpected error occurred. Please restart the app.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            className="text-accent text-sm underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
