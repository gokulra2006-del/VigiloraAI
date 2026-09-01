import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center p-4 text-white">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1C1C22] border border-red-500/20 rounded-[16px] p-8 max-w-md w-full text-center shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4 text-sm">
              We've encountered an unexpected error. Our team has been notified.
            </p>
            {this.state.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded p-3 mb-8 text-left overflow-auto max-h-32 text-xs text-red-400 font-mono">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-red-600 hover:bg-red-500 transition-colors rounded-[10px] font-medium"
            >
              <RefreshCcw size={18} />
              Reload Application
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
