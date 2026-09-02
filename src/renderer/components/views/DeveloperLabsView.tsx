import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  Lock,
  RotateCcw,
  Copy,
  Check,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  FEATURE_FLAGS,
  FeatureFlagId,
  FeatureFlagCategory,
  FeatureFlagStage,
  FeatureFlagDefinition,
} from '../../../shared/featureFlags.js';
import { useFeatureFlagStore } from '../../store/featureFlagStore.js';
import { useLibraryStore } from '../../store/libraryStore.js';

const CATEGORY_LABELS: Record<FeatureFlagCategory | 'all', string> = {
  all: 'All Categories',
  audio: 'Audio Engine',
  dj: 'DJ Suite',
  ui: 'UI & Visuals',
  connectivity: 'Connectivity',
  performance: 'Performance',
  experimental: 'Experimental',
};

const STAGE_CONFIG: Record<
  FeatureFlagStage,
  { label: string; badgeClass: string; rank: number }
> = {
  experimental: {
    label: 'EXPERIMENTAL',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    rank: 0,
  },
  alpha: {
    label: 'ALPHA',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    rank: 1,
  },
  beta: {
    label: 'BETA',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    rank: 2,
  },
  stable: {
    label: 'STABLE',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    rank: 3,
  },
};

export const DeveloperLabsView: React.FC = () => {
  const {
    isDevMode,
    overrides,
    getFlagValue,
    setFlagValue,
    resetFlag,
    resetAllFlags,
    isFlagOverridden,
    disableDevMode,
    exportConfig,
  } = useFeatureFlagStore();
  const { setView } = useLibraryStore();

  const [selectedCategory, setSelectedCategory] = useState<FeatureFlagCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyConfig = () => {
    const json = exportConfig();
    navigator.clipboard.writeText(json);
    setCopied(true);
    showToast('Flags configuration copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLockDevMode = () => {
    disableDevMode();
    setView('all'); // Return to main library view
  };

  const handleResetAll = () => {
    resetAllFlags();
    showToast('All flag overrides reset to defaults');
  };

  // Filter & Sort: Active experiments on top, 'stable' pushed to the bottom
  const sortedAndFilteredFlags = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return Object.values(FEATURE_FLAGS)
      .filter((flag) => {
        if (selectedCategory !== 'all' && flag.category !== selectedCategory) {
          return false;
        }
        if (query) {
          return (
            flag.name.toLowerCase().includes(query) ||
            flag.description.toLowerCase().includes(query) ||
            flag.id.toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        // 1. Sort by stage rank: experimental (0) -> alpha (1) -> beta (2) -> stable (3)
        const rankA = STAGE_CONFIG[a.stage].rank;
        const rankB = STAGE_CONFIG[b.stage].rank;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        // 2. Secondary sort: newest lastUpdated first
        return b.lastUpdated.localeCompare(a.lastUpdated);
      });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto min-h-0 bg-[var(--bg-primary)] text-[var(--text-primary)] select-none relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-8 bg-neutral-900 border border-purple-500/50 text-purple-300 px-4 py-2.5 rounded-xl shadow-2xl z-50 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-8 pb-6 border-b border-[var(--border-color)] bg-gradient-to-b from-purple-950/30 via-[var(--bg-secondary)] to-[var(--bg-primary)]">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl flex items-center justify-center flex-shrink-0">
                <FlaskConical className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">
                    Developer Labs
                  </h1>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase tracking-wider">
                    Dev Mode Unlocked
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  Unlocked via console. Test experimental feature gates, DSP variants, and tuning parameters.
                </p>
              </div>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleCopyConfig}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Copy current flag overrides as JSON"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-purple-400" />
                    <span>Export JSON</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Reset all flags to default values"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset All</span>
              </button>

              <button
                onClick={handleLockDevMode}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                title="Lock Developer Mode and hide this tab"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Dev Mode</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              {(Object.keys(CATEGORY_LABELS) as (FeatureFlagCategory | 'all')[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-md'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-shrink-0 w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search flags & experiments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content List */}
      <div className="max-w-5xl mx-auto p-8 space-y-4 pb-24">
        {sortedAndFilteredFlags.length === 0 ? (
          <div className="p-12 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-center text-xs text-[var(--text-muted)] space-y-2">
            <FlaskConical className="w-8 h-8 text-neutral-600 mx-auto" />
            <div className="font-semibold text-[var(--text-primary)]">No experiments found</div>
            <div>Try selecting another category or clearing your search filter.</div>
          </div>
        ) : (
          sortedAndFilteredFlags.map((flag) => {
            const flagId = flag.id as FeatureFlagId;
            const isOverridden = isFlagOverridden(flagId);
            const currentValue = getFlagValue(flagId);
            const stageMeta = STAGE_CONFIG[flag.stage];

            return (
              <div
                key={flag.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  flag.stage === 'stable'
                    ? 'bg-[var(--bg-secondary)]/60 border-[var(--border-color)] opacity-85'
                    : isOverridden
                    ? 'bg-[var(--bg-secondary)] border-purple-500/50 shadow-md ring-1 ring-purple-500/20'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                }`}
              >
                {/* Flag Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[var(--text-primary)]">{flag.name}</span>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${stageMeta.badgeClass}`}
                      >
                        {stageMeta.label}
                      </span>
                      <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-color)] uppercase">
                        {flag.category}
                      </span>
                      {flag.requiresRestart && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Restart Required
                        </span>
                      )}
                      {isOverridden && (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500 text-black">
                          OVERRIDDEN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {flag.description}
                    </div>
                  </div>

                  {/* Flag Control Header / Reset Action */}
                  {isOverridden && (
                    <button
                      onClick={() => {
                        resetFlag(flagId);
                        showToast(`Reset ${flag.name} to default`);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/20 flex-shrink-0 cursor-pointer transition-colors"
                      title="Reset flag to default"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset to default</span>
                    </button>
                  )}
                </div>

                {/* Dynamic Value Input / Sub-Value Options */}
                <div className="pt-3 border-t border-[var(--border-color)]">
                  {/* Type 1: Boolean Toggle */}
                  {flag.type === 'boolean' && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        Feature Enabled
                      </span>
                      <button
                        onClick={() => setFlagValue(flagId, !currentValue)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                          currentValue ? 'bg-purple-500' : 'bg-neutral-600'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                            currentValue ? 'translate-x-5.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Type 2: Select Multi-Variant Selector */}
                  {flag.type === 'select' && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Experiment Variant:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {flag.options.map((opt) => {
                          const isSelected = currentValue === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setFlagValue(flagId, opt.value)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
                                isSelected
                                  ? 'bg-purple-500/20 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500/30'
                                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-neutral-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">{opt.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                              </div>
                              {opt.description && (
                                <div className="text-[11px] text-[var(--text-muted)] leading-tight">
                                  {opt.description}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Type 3: Number Slider */}
                  {flag.type === 'number' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">Tuning Value</span>
                        <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                          {currentValue} {flag.unit || ''}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={flag.min ?? 0}
                        max={flag.max ?? 100}
                        step={flag.step ?? 1}
                        value={currentValue}
                        onChange={(e) => setFlagValue(flagId, Number(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Type 4: String Parameter */}
                  {flag.type === 'string' && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Custom Value:
                      </span>
                      <input
                        type="text"
                        placeholder={flag.placeholder || 'Enter value...'}
                        value={currentValue}
                        onChange={(e) => setFlagValue(flagId, e.target.value)}
                        className="w-full px-3.5 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Metadata Timestamps Footer */}
                <div className="pt-2.5 border-t border-[var(--border-color)]/60 flex items-center justify-between flex-wrap gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                  <div className="flex items-center gap-3">
                    <span>Created: {flag.createdDate}</span>
                    <span>•</span>
                    <span>Updated: {flag.lastUpdated}</span>
                  </div>
                  {flag.stage === 'stable' && flag.releaseDate && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span>Released: {flag.releaseDate}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
