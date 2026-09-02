import React from 'react';
import { create } from 'zustand';
import {
  FEATURE_FLAGS,
  FeatureFlagId,
  FeatureFlagDefinition,
  DEV_MODE_PASSKEY,
} from '../../shared/featureFlags.js';

const STORAGE_DEV_PASSKEY_KEY = 'purrsonica:dev_passkey';
const STORAGE_OVERRIDES_KEY = 'purrsonica:flag_overrides';

interface FeatureFlagState {
  isDevMode: boolean;
  overrides: Record<string, any>;
  enableDevMode: (passcode?: string) => boolean;
  disableDevMode: () => void;
  getFlagValue: <T = any>(flagId: FeatureFlagId | string) => T;
  setFlagValue: (flagId: FeatureFlagId | string, value: any) => void;
  resetFlag: (flagId: FeatureFlagId | string) => void;
  resetAllFlags: () => void;
  isFlagOverridden: (flagId: FeatureFlagId | string) => boolean;
  exportConfig: () => string;
  importConfig: (jsonStr: string) => boolean;
}

const loadInitialDevMode = (): boolean => {
  try {
    const savedKey = localStorage.getItem(STORAGE_DEV_PASSKEY_KEY);
    // If passkey matches current DEV_MODE_PASSKEY, remain unlocked
    if (savedKey && savedKey === DEV_MODE_PASSKEY) {
      return true;
    }
    // If the passkey was rotated or doesn't match, auto-lock
    if (savedKey) {
      localStorage.removeItem(STORAGE_DEV_PASSKEY_KEY);
    }
    return false;
  } catch {
    return false;
  }
};

const loadInitialOverrides = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const resolveFlagDef = (
  flagId: string
): { key: FeatureFlagId; def: FeatureFlagDefinition } | null => {
  if (FEATURE_FLAGS[flagId as FeatureFlagId]) {
    return { key: flagId as FeatureFlagId, def: FEATURE_FLAGS[flagId as FeatureFlagId] };
  }
  const match = Object.entries(FEATURE_FLAGS).find(
    ([k, def]) =>
      k.toLowerCase() === flagId.toLowerCase() ||
      def.id.toLowerCase() === flagId.toLowerCase()
  );
  if (match) {
    return { key: match[0] as FeatureFlagId, def: match[1] };
  }
  return null;
};

export const useFeatureFlagStore = create<FeatureFlagState>((set, get) => ({
  isDevMode: loadInitialDevMode(),
  overrides: loadInitialOverrides(),

  enableDevMode: (passcode?: string) => {
    if (!passcode || passcode !== DEV_MODE_PASSKEY) {
      return false;
    }
    try {
      localStorage.setItem(STORAGE_DEV_PASSKEY_KEY, passcode);
    } catch {}
    set({ isDevMode: true });
    return true;
  },

  disableDevMode: () => {
    try {
      localStorage.removeItem(STORAGE_DEV_PASSKEY_KEY);
    } catch {}
    set({ isDevMode: false });
  },

  getFlagValue: <T = any>(flagId: FeatureFlagId | string): T => {
    const state = get();
    const resolved = resolveFlagDef(flagId as string);
    if (!resolved) {
      console.warn(`[FeatureFlags] Unknown flagId "${flagId}" queried.`);
      return undefined as unknown as T;
    }

    if (state.overrides[resolved.key] !== undefined) {
      return state.overrides[resolved.key] as T;
    }
    if (state.overrides[resolved.def.id] !== undefined) {
      return state.overrides[resolved.def.id] as T;
    }
    if (state.overrides[flagId] !== undefined) {
      return state.overrides[flagId] as T;
    }

    return resolved.def.defaultValue as T;
  },

  setFlagValue: (flagId: FeatureFlagId | string, value: any) => {
    const resolved = resolveFlagDef(flagId as string);
    const primaryKey = resolved ? resolved.key : (flagId as FeatureFlagId);
    const nextOverrides = { ...get().overrides, [primaryKey]: value };
    if (resolved && resolved.def.id && resolved.def.id !== primaryKey) {
      nextOverrides[resolved.def.id] = value;
    }
    try {
      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(nextOverrides));
    } catch {}
    set({ overrides: nextOverrides });
  },

  resetFlag: (flagId: FeatureFlagId | string) => {
    const resolved = resolveFlagDef(flagId as string);
    const nextOverrides = { ...get().overrides };
    const keysToDelete = [
      flagId,
      (flagId as string).toLowerCase(),
      (flagId as string).toUpperCase(),
      resolved?.key,
      resolved?.def.id,
      resolved?.def.id.toLowerCase(),
    ].filter(Boolean) as string[];

    for (const k of keysToDelete) {
      delete nextOverrides[k];
    }

    try {
      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(nextOverrides));
    } catch {}
    set({ overrides: nextOverrides });
  },

  isFlagOverridden: (flagId: FeatureFlagId | string): boolean => {
    const state = get();
    const resolved = resolveFlagDef(flagId as string);
    const keysToCheck = [
      flagId,
      (flagId as string).toLowerCase(),
      (flagId as string).toUpperCase(),
      resolved?.key,
      resolved?.def.id,
      resolved?.def.id.toLowerCase(),
    ].filter(Boolean) as string[];

    return keysToCheck.some((k) => state.overrides[k] !== undefined);
  },

  resetAllFlags: () => {
    try {
      localStorage.removeItem(STORAGE_OVERRIDES_KEY);
    } catch {}
    set({ overrides: {} });
  },

  exportConfig: (): string => {
    const state = get();
    return JSON.stringify(
      {
        purrsonicaFlags: true,
        version: 1,
        exportedAt: new Date().toISOString(),
        devMode: state.isDevMode,
        overrides: state.overrides,
      },
      null,
      2
    );
  },

  importConfig: (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === 'object' && parsed.overrides) {
        set({ overrides: parsed.overrides });
        localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(parsed.overrides));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));

/**
 * Hook to read a boolean feature flag state.
 */
export function useFeatureFlag(flagId: FeatureFlagId | string): boolean {
  return useFeatureFlagStore((state) => {
    const resolved = resolveFlagDef(flagId as string);
    if (!resolved) return false;

    if (state.overrides[resolved.key] !== undefined) {
      return Boolean(state.overrides[resolved.key]);
    }
    if (state.overrides[resolved.def.id] !== undefined) {
      return Boolean(state.overrides[resolved.def.id]);
    }
    if (state.overrides[flagId] !== undefined) {
      return Boolean(state.overrides[flagId]);
    }
    return Boolean(resolved.def.defaultValue);
  });
}

/**
 * Hook to read any parameterized feature flag value (select, number, string, boolean).
 */
export function useFeatureFlagValue<T = any>(flagId: FeatureFlagId | string): T {
  return useFeatureFlagStore((state) => {
    const resolved = resolveFlagDef(flagId as string);
    if (!resolved) return undefined as T;

    if (state.overrides[resolved.key] !== undefined) {
      return state.overrides[resolved.key] as T;
    }
    if (state.overrides[resolved.def.id] !== undefined) {
      return state.overrides[resolved.def.id] as T;
    }
    if (state.overrides[flagId] !== undefined) {
      return state.overrides[flagId] as T;
    }
    return resolved.def.defaultValue as T;
  });
}

/**
 * Declarative component to conditionally render children based on a boolean feature flag.
 */
export const FeatureGate: React.FC<{
  flag: FeatureFlagId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ flag, children, fallback = null }) => {
  const isEnabled = useFeatureFlag(flag);
  return React.createElement(React.Fragment, null, isEnabled ? children : fallback);
};
