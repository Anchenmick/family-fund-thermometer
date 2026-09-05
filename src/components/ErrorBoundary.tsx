import { Component, ErrorInfo, ReactNode } from "react";
import { extractErrorMessage } from "@/lib/convexErrors";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: unknown;
}

/**
 * Catches render errors thrown by queries, most importantly a rejected
 * Convex query when requireAuthForViewer is switched on for a signed-out
 * visitor. React error boundaries must be class components: hooks cannot
 * catch render errors. Reuses extractErrorMessage so a ConvexError's clean
 * sentence is shown instead of a diagnostic wrapper.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Unhandled error while rendering:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {extractErrorMessage(this.state.error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
