/// <reference types="vite/client" />

import { ElectronAPI } from '../preload/index.js';

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
