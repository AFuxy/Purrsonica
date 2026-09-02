import { useFeatureFlagStore } from '../store/featureFlagStore.js';
import { FEATURE_FLAGS, FeatureFlagId } from '../../shared/featureFlags.js';

export interface PurrsonicaConsoleAPI {
  enableDevMode: (passcode?: string) => string;
  enableDevTools: (passcode?: string) => string;
  disableDevMode: () => string;
  disableDevTools: () => string;
  listFlags: () => string;
  flags: () => string;
  setFlag: (flagId: FeatureFlagId, value: any) => string;
  resetFlags: () => string;
  exportConfig: () => string;
  importConfig: (jsonStr: string) => string;
  help: () => string;
}

declare global {
  interface Window {
    purrsonica?: PurrsonicaConsoleAPI;
  }
}

/**
 * Creates a function with custom .toString() representation so inspecting in DevTools
 * prints clear usage instructions rather than raw TypeScript/JavaScript code.
 */
function createHelperFunction<T extends Function>(fn: T, usageHelp: string): T {
  fn.toString = () => usageHelp;
  return fn;
}

export function initDevToolsConsole(): void {
  if (typeof window === 'undefined') return;

  const enableDevMode = createHelperFunction(
    (passcode?: string): string => {
      const success = useFeatureFlagStore.getState().enableDevMode(passcode);
      if (!success) {
        console.error(
          '%c[Purrsonica DevMode]%c Access Denied: Invalid or missing passkey.\nUsage: purrsonica.enableDevMode("YOUR_PASSKEY")',
          'color: #ef4444; font-weight: bold;',
          'color: #f87171;'
        );
        return 'Access Denied: Passkey required. Usage: purrsonica.enableDevMode("YOUR_PASSKEY")';
      }

      console.log(
        '%c[Purrsonica DevMode]%c Developer Mode is now ENABLED! The "Labs" tab is unlocked in the Sidebar.',
        'color: #10b981; font-weight: bold;',
        'color: #e2e8f0;'
      );
      window.dispatchEvent(
        new CustomEvent('purrsonica:devmode_changed', { detail: { enabled: true } })
      );
      return 'Developer Mode Activated. "Labs" tab unlocked in the Sidebar.';
    },
    'Usage: purrsonica.enableDevMode("YOUR_PASSKEY")'
  );

  const disableDevMode = createHelperFunction(
    (): string => {
      useFeatureFlagStore.getState().disableDevMode();
      console.log(
        '%c[Purrsonica DevMode]%c Developer Mode is now DISABLED.',
        'color: #f59e0b; font-weight: bold;',
        'color: #e2e8f0;'
      );
      window.dispatchEvent(
        new CustomEvent('purrsonica:devmode_changed', { detail: { enabled: false } })
      );
      return 'Developer Mode Disabled.';
    },
    'Usage: purrsonica.disableDevMode()'
  );

  const listFlags = createHelperFunction(
    (): string => {
      const state = useFeatureFlagStore.getState();
      const rows = Object.values(FEATURE_FLAGS).map((def) => {
        const activeValue =
          state.overrides[def.id as FeatureFlagId] !== undefined
            ? state.overrides[def.id as FeatureFlagId]
            : def.defaultValue;

        const isOverridden = state.overrides[def.id as FeatureFlagId] !== undefined;

        return {
          ID: def.id,
          Name: def.name,
          Category: def.category.toUpperCase(),
          Stage: def.stage.toUpperCase(),
          Type: def.type,
          ActiveValue: activeValue,
          Default: def.defaultValue,
          Overridden: isOverridden ? 'YES' : 'no',
          Created: def.createdDate,
          Updated: def.lastUpdated,
          Released: def.releaseDate || '-',
        };
      });

      console.log('%c[Purrsonica Feature Flags Registry]', 'color: #8b5cf6; font-weight: bold; font-size: 13px;');
      console.table(rows);
      return 'Listed all feature flags.';
    },
    'Usage: purrsonica.listFlags()'
  );

  const setFlag = createHelperFunction(
    (flagId: FeatureFlagId, value: any): string => {
      const def = FEATURE_FLAGS[flagId];
      if (!def) {
        console.warn(`[Purrsonica] Unknown flag ID: "${flagId}". Use purrsonica.listFlags() to see all flags.`);
        return `Unknown flag ID: "${flagId}".`;
      }
      useFeatureFlagStore.getState().setFlagValue(flagId, value);
      console.log(
        `%c[Purrsonica Flag Updated]%c ${flagId} = ${JSON.stringify(value)}`,
        'color: #06b6d4; font-weight: bold;',
        'color: #e2e8f0;'
      );
      return `Flag "${flagId}" set to ${JSON.stringify(value)}.`;
    },
    'Usage: purrsonica.setFlag("FLAG_ID", value)'
  );

  const resetFlags = createHelperFunction(
    (): string => {
      useFeatureFlagStore.getState().resetAllFlags();
      console.log('%c[Purrsonica]%c All flag overrides have been reset to defaults.', 'color: #10b981;', 'color: #e2e8f0;');
      return 'All flags reset to default.';
    },
    'Usage: purrsonica.resetFlags()'
  );

  const exportConfig = createHelperFunction(
    (): string => {
      const json = useFeatureFlagStore.getState().exportConfig();
      console.log(json);
      return json;
    },
    'Usage: purrsonica.exportConfig()'
  );

  const importConfig = createHelperFunction(
    (jsonStr: string): string => {
      const ok = useFeatureFlagStore.getState().importConfig(jsonStr);
      if (ok) {
        console.log('%c[Purrsonica]%c Config imported successfully!', 'color: #10b981;', 'color: #e2e8f0;');
        return 'Config imported successfully.';
      }
      console.error('[Purrsonica] Failed to import config. Ensure valid JSON.');
      return 'Failed to import config.';
    },
    'Usage: purrsonica.importConfig(jsonString)'
  );

  const help = createHelperFunction(
    (): string => {
      console.log(
        `%c=== Purrsonica Developer Console Commands ===%c
 • purrsonica.enableDevMode('passkey') - Unlock Labs in the Sidebar
 • purrsonica.disableDevMode()          - Lock Developer Mode and hide Labs
 • purrsonica.listFlags()               - Print table of all flags and values
 • purrsonica.setFlag(id, value)        - Set a specific flag override
 • purrsonica.resetFlags()              - Reset all flags to defaults
 • purrsonica.exportConfig()            - Export active flags JSON
 • purrsonica.importConfig(json)        - Import flags JSON
`,
        'color: #8b5cf6; font-weight: bold;',
        'color: #cbd5e1;'
      );
      return '';
    },
    'Usage: purrsonica.help()'
  );

  const api: any = {
    enableDevMode,
    enableDevTools: enableDevMode, // Alias for convenience
    disableDevMode,
    disableDevTools: disableDevMode, // Alias for convenience
    listFlags,
    flags: listFlags, // Alias for convenience
    setFlag,
    resetFlags,
    exportConfig,
    importConfig,
    help,
  };

  // Add custom toString on purrsonica root object
  api.toString = () => 'Purrsonica Developer API. Type purrsonica.help() for commands.';

  window.purrsonica = api;
}
