import React from 'react';
import { AlertTriangle, Clock, HelpCircle, X } from 'lucide-react';

export interface ActionConfirmConfig {
  title: string;
  description: string;
  points?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  estimatedTime?: string;
  onConfirm: () => void;
}

interface ActionConfirmModalProps {
  config: ActionConfirmConfig | null;
  onClose: () => void;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({ config, onClose }) => {
  if (!config) return null;

  const {
    title,
    description,
    points = [],
    confirmLabel = 'Proceed',
    cancelLabel = 'Cancel',
    isDestructive = false,
    estimatedTime,
    onConfirm,
  } = config;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 select-none animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDestructive
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isDestructive ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <HelpCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{title}</h3>
              {estimatedTime && (
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>Est. Time: {estimatedTime}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>

          {points.length > 0 && (
            <div className="p-3 bg-[var(--bg-tertiary)]/70 rounded-xl border border-[var(--border-color)] space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                What this action does:
              </span>
              <ul className="space-y-1">
                {points.map((pt, idx) => (
                  <li key={idx} className="text-xs text-[var(--text-primary)] flex items-start gap-2">
                    <span className={`text-[10px] mt-0.5 ${isDestructive ? 'text-rose-400' : 'text-amber-400'}`}>•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer ${
              isDestructive
                ? 'bg-rose-500 hover:bg-rose-400 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
