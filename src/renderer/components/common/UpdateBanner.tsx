import React from 'react';
import { Sparkles, Download, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useUpdateStore } from '../../store/updateStore.js';

export const UpdateBanner: React.FC = () => {
  const { status, isDismissed, setDismissed, installUpdate } = useUpdateStore();

  if (isDismissed) return null;
  if (status.state === 'idle' || status.state === 'not-available') return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-white z-40 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {status.state === 'downloading' && (
          <>
            <Download className="w-4 h-4 text-emerald-400 animate-bounce flex-shrink-0" />
            <span>
              Downloading Purrsonica update {status.version ? `v${status.version}` : ''} ({status.percent || 0}%)...
            </span>
          </>
        )}

        {status.state === 'downloaded' && (
          <>
            <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span className="font-semibold">
              Purrsonica update {status.version ? `v${status.version}` : ''} is downloaded and ready!
            </span>
          </>
        )}

        {status.state === 'available' && (
          <>
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
            <span>Found new update {status.version ? `v${status.version}` : ''}...</span>
          </>
        )}

        {status.state === 'error' && (
          <span className="text-rose-300">
            Update notice: {status.errorMessage || 'Could not reach update server'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        {status.state === 'downloaded' && (
          <button
            onClick={installUpdate}
            className="flex items-center gap-1 px-3 py-1 bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs rounded-md shadow transition-all hover:scale-105"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Restart & Install</span>
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="text-emerald-300/70 hover:text-white p-1 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
