import React from 'react';
import { CAMELOT_WHEEL, getHarmonicCompatibleKeys } from '../../../shared/camelot.js';

interface CamelotWheelPickerProps {
  selectedCamelot?: string;
  onSelectKey: (camelot: string, musicalKey: string) => void;
}

export const CamelotWheelPicker: React.FC<CamelotWheelPickerProps> = ({
  selectedCamelot,
  onSelectKey,
}) => {
  const compatibleKeys = selectedCamelot
    ? getHarmonicCompatibleKeys(selectedCamelot)
    : [];

  const minorKeys = CAMELOT_WHEEL.filter((k) => k.isMinor).sort(
    (a, b) => parseInt(a.camelot) - parseInt(b.camelot)
  );
  const majorKeys = CAMELOT_WHEEL.filter((k) => !k.isMinor).sort(
    (a, b) => parseInt(a.camelot) - parseInt(b.camelot)
  );

  return (
    <div className="bg-[var(--bg-tertiary)] p-3 rounded-lg border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-[var(--border-color)]">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          Camelot Wheel Harmonic Selector
        </span>
        {selectedCamelot && (
          <span className="text-[11px] text-emerald-400 font-mono">
            Selected: {selectedCamelot} (
            {CAMELOT_WHEEL.find((k) => k.camelot === selectedCamelot)?.musicalKey}
            )
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Minor Keys (A) */}
        <div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1">
            Minor Keys (A)
          </div>
          <div className="grid grid-cols-3 gap-1">
            {minorKeys.map((item) => {
              const isSelected = selectedCamelot === item.camelot;
              const isCompatible = compatibleKeys.includes(item.camelot);

              return (
                <button
                  key={item.camelot}
                  type="button"
                  onClick={() => onSelectKey(item.camelot, item.musicalKey)}
                  className={`px-1.5 py-1 rounded text-left flex flex-col transition-all text-xs border ${
                    isSelected
                      ? 'bg-emerald-500 text-white font-bold border-emerald-400 shadow-md'
                      : isCompatible
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`${item.camelot} - ${item.musicalKey}`}
                >
                  <span className="font-mono font-bold text-[11px]">{item.camelot}</span>
                  <span className="text-[9px] truncate opacity-85">{item.musicalKey.replace(' Minor', 'm')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Major Keys (B) */}
        <div>
          <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider mb-1">
            Major Keys (B)
          </div>
          <div className="grid grid-cols-3 gap-1">
            {majorKeys.map((item) => {
              const isSelected = selectedCamelot === item.camelot;
              const isCompatible = compatibleKeys.includes(item.camelot);

              return (
                <button
                  key={item.camelot}
                  type="button"
                  onClick={() => onSelectKey(item.camelot, item.musicalKey)}
                  className={`px-1.5 py-1 rounded text-left flex flex-col transition-all text-xs border ${
                    isSelected
                      ? 'bg-teal-500 text-white font-bold border-teal-400 shadow-md'
                      : isCompatible
                      ? 'bg-teal-950/40 text-teal-300 border-teal-700/50 hover:bg-teal-900/60'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-transparent hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                  }`}
                  title={`${item.camelot} - ${item.musicalKey}`}
                >
                  <span className="font-mono font-bold text-[11px]">{item.camelot}</span>
                  <span className="text-[9px] truncate opacity-85">{item.musicalKey.replace(' Major', ' Maj')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedCamelot && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
          <span>Harmonic Mixing Matches:</span>
          <div className="flex gap-1">
            {compatibleKeys.map((k) => (
              <span
                key={k}
                className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] font-mono text-emerald-400 font-semibold"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
