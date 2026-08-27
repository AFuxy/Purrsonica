import { create } from 'zustand';
import { ScanProgress, ScanSettings, ScanStatus } from '../../shared/types.js';

interface ScanState {
  isModalOpen: boolean;
  progress: ScanProgress;
  settings: ScanSettings | null;
  selectedDrivesToScan: string[];

  setModalOpen: (open: boolean) => void;
  setProgress: (progress: ScanProgress) => void;
  setSettings: (settings: ScanSettings) => void;
  setSelectedDrives: (drives: string[]) => void;
  toggleDriveSelection: (driveLetter: string) => void;

  fetchSettings: () => Promise<void>;
  saveSettings: (settings: ScanSettings) => Promise<void>;
  addExclusion: (path: string) => Promise<void>;
  removeExclusion: (path: string) => Promise<void>;

  startScan: (drives?: string[], customFolders?: string[]) => Promise<void>;
  stopScan: () => Promise<void>;
}

const initialProgress: ScanProgress = {
  status: 'idle',
  scannedFilesCount: 0,
  foundMediaCount: 0,
  newMediaCount: 0,
  elapsedMs: 0,
};

export const useScanStore = create<ScanState>((set, get) => ({
  isModalOpen: false,
  progress: initialProgress,
  settings: null,
  selectedDrivesToScan: [],

  setModalOpen: (isModalOpen: boolean) => set({ isModalOpen }),

  setProgress: (progress: ScanProgress) => set({ progress }),

  setSettings: (settings: ScanSettings) => set({ settings }),

  setSelectedDrives: (selectedDrivesToScan: string[]) => set({ selectedDrivesToScan }),

  toggleDriveSelection: (driveLetter: string) => {
    const current = get().selectedDrivesToScan;
    if (current.includes(driveLetter)) {
      set({ selectedDrivesToScan: current.filter((d) => d !== driveLetter) });
    } else {
      set({ selectedDrivesToScan: [...current, driveLetter] });
    }
  },

  fetchSettings: async () => {
    if (!window.api) return;
    try {
      const settings = await window.api.getScanSettings();
      set({ settings });
    } catch (err) {
      console.error('Error fetching scan settings:', err);
    }
  },

  saveSettings: async (settings: ScanSettings) => {
    if (!window.api) return;
    try {
      const updated = await window.api.saveScanSettings(settings);
      set({ settings: updated });
    } catch (err) {
      console.error('Error saving scan settings:', err);
    }
  },

  addExclusion: async (exclusionPath: string) => {
    const { settings, saveSettings } = get();
    if (!settings || !exclusionPath.trim()) return;

    const trimmed = exclusionPath.trim();
    if (!settings.excludedPaths.includes(trimmed)) {
      const updated = {
        ...settings,
        excludedPaths: [...settings.excludedPaths, trimmed],
      };
      await saveSettings(updated);
    }
  },

  removeExclusion: async (exclusionPath: string) => {
    const { settings, saveSettings } = get();
    if (!settings) return;

    const updated = {
      ...settings,
      excludedPaths: settings.excludedPaths.filter((p) => p !== exclusionPath),
    };
    await saveSettings(updated);
  },

  startScan: async (drives?: string[], customFolders?: string[]) => {
    if (!window.api) return;
    try {
      const targetDrives = drives && drives.length > 0 ? drives : get().selectedDrivesToScan;
      const initial = await window.api.startScan(targetDrives, customFolders);
      set({ progress: initial, isModalOpen: true });
    } catch (err) {
      console.error('Error starting scan:', err);
    }
  },

  stopScan: async () => {
    if (!window.api) return;
    try {
      const stopped = await window.api.stopScan();
      set({ progress: stopped });
    } catch (err) {
      console.error('Error stopping scan:', err);
    }
  },
}));
