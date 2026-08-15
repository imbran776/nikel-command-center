import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MapErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full min-h-[350px] w-full flex-col items-center justify-center rounded-xl border border-[#2A3036] bg-[#0D1116] p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#D6403E]/10 text-[#D6403E]">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="mb-1 text-sm font-semibold tracking-wide text-[#E8ECEF]">
            LIVE MAP DISPLAY ERROR
          </h3>
          <p className="mb-4 max-w-md text-xs text-[#8A949C]">
            Gagal memuat engine peta interaktif (Leaflet/Network timeout). Anda dapat merefresh komponen map di bawah tanpa perlu reload seluruh halaman.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-md bg-[#1ADBDE] px-3.5 py-1.5 text-xs font-semibold text-[#0D1116] hover:bg-[#4AE5E8]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Muat Ulang Map
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
