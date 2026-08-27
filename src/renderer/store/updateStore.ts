import { create } from 'zustand';
import { UpdateStatus } from '../../shared/types.js';

interface UpdateState {
  status: UpdateStatus;
  isChecking: boolean;
  isDismissed: boolean;

  setStatus: (status: UpdateStatus) => void;
  setDismissed: (dismissed: boolean) => void;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: { state: 'idle' },
  isChecking: false,
  isDismissed: false,

  setStatus: (status: UpdateStatus) => {
    set({
      status,
      isChecking: status.state === 'checking',
      isDismissed: false,
    });
  },

  setDismissed: (isDismissed: boolean) => set({ isDismissed }),

  checkForUpdates: async () => {
    if (!window.api?.checkForUpdates) return;
    set({ isChecking: true, isDismissed: false });
    try {
      const res = await window.api.checkForUpdates();
      if (res) {
        set({ status: res, isChecking: res.state === 'checking' });
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      set({ isChecking: false });
    }
  },

  installUpdate: async () => {
    if (!window.api?.installUpdate) return;
    try {
      await window.api.installUpdate();
    } catch (err) {
      console.error('Error installing update:', err);
    }
  },
}));
