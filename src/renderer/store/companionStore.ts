import { create } from 'zustand';
import {
  CompanionDevice,
  CompanionServerStatus,
  MobilePlaybackState,
  PlaybackTarget,
} from '../../shared/types.js';

interface CompanionStoreState {
  serverStatus: CompanionServerStatus | null;
  devices: CompanionDevice[];
  isPairingModalOpen: boolean;
  mobilePlaybackState: MobilePlaybackState | null;
  playbackTarget: PlaybackTarget;

  // Actions
  fetchStatus: () => Promise<void>;
  fetchDevices: () => Promise<void>;
  openPairingModal: () => void;
  closePairingModal: () => void;
  disconnectDevice: (id: string) => Promise<boolean>;
  revokeDevice: (id: string) => Promise<boolean>;
  sendRemoteCommand: (cmd: any, deviceId?: string) => Promise<boolean>;
  setPlaybackTarget: (target: PlaybackTarget) => void;
  setMobilePlaybackState: (state: MobilePlaybackState | null) => void;
  initCompanionListeners: () => () => void;
}

export const useCompanionStore = create<CompanionStoreState>((set, get) => ({
  serverStatus: null,
  devices: [],
  isPairingModalOpen: false,
  mobilePlaybackState: null,
  playbackTarget: 'desktop',

  fetchStatus: async () => {
    if (!window.api?.getCompanionStatus) return;
    try {
      const status = await window.api.getCompanionStatus();
      set({ serverStatus: status });
    } catch (err) {
      console.error('Failed to fetch companion server status:', err);
    }
  },

  fetchDevices: async () => {
    if (!window.api?.getCompanionDevices) return;
    try {
      const devices = await window.api.getCompanionDevices();
      set({ devices });
    } catch (err) {
      console.error('Failed to fetch companion devices:', err);
    }
  },

  openPairingModal: () => set({ isPairingModalOpen: true }),
  closePairingModal: () => set({ isPairingModalOpen: false }),

  disconnectDevice: async (id: string) => {
    if (!window.api?.disconnectCompanionDevice) return false;
    try {
      const success = await window.api.disconnectCompanionDevice(id);
      await get().fetchDevices();
      await get().fetchStatus();
      return success;
    } catch (err) {
      console.error('Failed to disconnect device:', err);
      return false;
    }
  },

  revokeDevice: async (id: string) => {
    if (!window.api?.revokeCompanionDevice) return false;
    try {
      const success = await window.api.revokeCompanionDevice(id);
      await get().fetchDevices();
      await get().fetchStatus();
      return success;
    } catch (err) {
      console.error('Failed to revoke device:', err);
      return false;
    }
  },

  sendRemoteCommand: async (cmd: any, deviceId?: string) => {
    if (!window.api?.sendCompanionRemoteCommand) return false;
    try {
      return await window.api.sendCompanionRemoteCommand(cmd, deviceId);
    } catch (err) {
      console.error('Failed to send remote command to companion:', err);
      return false;
    }
  },

  setPlaybackTarget: (target) => set({ playbackTarget: target }),

  setMobilePlaybackState: (state) => set({ mobilePlaybackState: state }),

  initCompanionListeners: () => {
    if (!window.api) {
      return () => {};
    }

    // Refresh device list on new pairing
    const unsubPaired = window.api.onCompanionDevicePaired?.(() => {
      get().fetchDevices();
      get().fetchStatus();
    });

    // Update state on connect
    const unsubConnected = window.api.onCompanionDeviceConnected?.(() => {
      get().fetchDevices();
      get().fetchStatus();
    });

    // Update state on disconnect
    const unsubDisconnected = window.api.onCompanionDeviceDisconnected?.((device) => {
      get().fetchDevices();
      get().fetchStatus();
      if (get().mobilePlaybackState?.deviceId === device.id) {
        set({ mobilePlaybackState: null, playbackTarget: 'desktop' });
      }
    });

    // Track phone playback state when phone is playing or paused
    const unsubMobileState = window.api.onCompanionMobilePlaybackState?.((state) => {
      if (state.trackId) {
        set({
          mobilePlaybackState: {
            ...state,
            lastReceivedAt: Date.now(),
          },
          ...(state.isPlaying ? { playbackTarget: 'remote_mobile' } : {}),
        });
      } else {
        set({ mobilePlaybackState: null });
      }
    });

    // Initial fetch
    get().fetchStatus();
    get().fetchDevices();

    return () => {
      unsubPaired?.();
      unsubConnected?.();
      unsubDisconnected?.();
      unsubMobileState?.();
    };
  },
}));
