import React, { useState } from 'react';
import { CheckCircle2, Clock, Copy, Check, X, FileText, AlertCircle, Sparkles } from 'lucide-react';

export interface ActionReportStat {
  label: string;
  value: string | number;
  color?: string;
}

export interface ActionReportSection {
  title: string;
  items: string[];
}

export interface ActionReportData {
  id: string;
  title: string;
  taskType: 'clean_dead' | 'artwork' | 'waveforms' | 'audio_analysis' | 'duplicates' | 'wipe';
  timestamp: number;
  durationMs: number;
  status: 'completed' | 'cancelled' | 'error';
  statusMessage: string;
  stats: ActionReportStat[];
  sections?: ActionReportSection[];
}

interface ActionReportModalProps {
  report: ActionReportData | null;
  onClose: () => void;
}

export const ActionReportModal: React.FC<ActionReportModalProps> = ({ report, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const { title, timestamp, durationMs, status, statusMessage, stats, sections = [] } = report;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    if (Number(sec) < 60) return `${sec}s`;
    const min = Math.floor(ms / 60000);
    const remSec = Math.round((ms % 60000) / 1000);
    return `${min}m ${remSec}s`;
  };

  const handleCopySummary = () => {
    const lines = [
      `=== Purrsonica After-Action Report ===`,
      `Task: ${title}`,
      `Date: ${new Date(timestamp).toLocaleString()}`,
      `Duration: ${formatDuration(durationMs)}`,
      `Status: ${status.toUpperCase()} - ${statusMessage}`,
      ``,
      `--- Summary Metrics ---`,
      ...stats.map((s) => `${s.label}: ${s.value}`),
    ];

    if (sections.length > 0) {
      lines.push(``, `--- Breakdown ---`);
      sections.forEach((sec) => {
        lines.push(`[${sec.title}]`);
        sec.items.forEach((it) => lines.push(` • ${it}`));
      });
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 select-none animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{title}</h3>
                <span
                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                    status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : status === 'cancelled'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {status}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-1 font-mono">
                <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(durationMs)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Report Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Status Message Alert */}
          <div className="p-3 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Performance & Numbers
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {stats.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[var(--bg-tertiary)]/70 rounded-xl border border-[var(--border-color)]"
                >
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] truncate">{s.label}</div>
                  <div className={`text-base font-black font-mono mt-0.5 ${s.color || 'text-[var(--text-primary)]'}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Breakdown Sections */}
          {sections.length > 0 && (
            <div className="space-y-3 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                Detailed Log & Actions Taken
              </span>
              {sections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[var(--bg-tertiary)]/50 rounded-xl border border-[var(--border-color)] space-y-2"
                >
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{sec.title}</span>
                  </h4>
                  <ul className="space-y-1">
                    {sec.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="text-[10px] text-emerald-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)]">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
