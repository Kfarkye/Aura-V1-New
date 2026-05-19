import React from 'react';
import { AlertCircle } from 'lucide-react';

export class SafeArtifactBoundary extends React.Component<{children: React.ReactNode, name: string}, {hasError: boolean, errorMsg: string}> {
  constructor(props: {children: React.ReactNode, name: string}) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, errorMsg: error.message }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Artifact Render Failure (${this.props.name}):`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 border border-red-200 bg-red-50 rounded-[16px] p-4 flex items-start gap-3 text-red-700 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-bold uppercase tracking-[0.1em] text-[0.65rem] mb-1 opacity-80">{this.props.name} Render Failure</p>
            <p className="font-mono text-[0.75rem] break-words">{this.state.errorMsg || 'Component crashed.'}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
