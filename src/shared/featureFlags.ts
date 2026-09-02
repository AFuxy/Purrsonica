export type FeatureFlagStage = 'experimental' | 'alpha' | 'beta' | 'stable';

/**
 * Configure the secret developer passcode required to unlock Developer Labs via console.
 * You can customize this string anytime to change the passkey.
 */
export const DEV_MODE_PASSKEY = 'purrdev2026';

export type FeatureFlagCategory =
  | 'audio'
  | 'dj'
  | 'ui'
  | 'connectivity'
  | 'performance'
  | 'experimental';

export type FeatureFlagValueType = 'boolean' | 'select' | 'number' | 'string';

export interface BaseFeatureFlag {
  id: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  stage: FeatureFlagStage;
  createdDate: string; // YYYY-MM-DD
  lastUpdated: string; // YYYY-MM-DD
  releaseDate?: string; // YYYY-MM-DD (set when graduated/released to public)
  requiresRestart?: boolean;
}

export interface BooleanFeatureFlag extends BaseFeatureFlag {
  type: 'boolean';
  defaultValue: boolean;
}

export interface SelectFeatureFlag<T extends string = string> extends BaseFeatureFlag {
  type: 'select';
  defaultValue: T;
  options: { value: T; label: string; description?: string }[];
}

export interface NumberFeatureFlag extends BaseFeatureFlag {
  type: 'number';
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface StringFeatureFlag extends BaseFeatureFlag {
  type: 'string';
  defaultValue: string;
  placeholder?: string;
}

export type FeatureFlagDefinition =
  | BooleanFeatureFlag
  | SelectFeatureFlag
  | NumberFeatureFlag
  | StringFeatureFlag;

export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  // 1. Settings Tabbed Layout & Deep-Linking (UI / Navigation)
  SETTINGS_TABBED_LAYOUT: {
    id: 'SETTINGS_TABBED_LAYOUT',
    name: 'Tabbed Settings Layout & Deep-Linking',
    description: 'Categorizes the Settings view into organized tabs (Appearance, Library & Audio, DJ Suite, Storage & Maintenance, System & Updates, Danger Zone) with persistent tab state and direct deep-linking.',
    category: 'ui',
    stage: 'beta',
    type: 'boolean',
    defaultValue: false,
    createdDate: '2026-09-02',
    lastUpdated: '2026-09-02',
  },
} as const;

export type FeatureFlagId = keyof typeof FEATURE_FLAGS;


