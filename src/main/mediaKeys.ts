import { globalShortcut, BrowserWindow } from 'electron';

/**
 * Registers OS-level hardware multimedia key shortcuts (Play/Pause, Next, Previous, Stop)
 * so playback can be controlled even when Purrsonica is minimized or in the background.
 */
export function registerGlobalMediaShortcuts(mainWindow: BrowserWindow): void {
  try {
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media:global-key', 'play-pause');
      }
    });

    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media:global-key', 'next');
      }
    });

    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media:global-key', 'previous');
      }
    });

    globalShortcut.register('MediaStop', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media:global-key', 'stop');
      }
    });

    console.log('[Global Media Keys] Registered hardware media keys (PlayPause, Next, Previous, Stop).');
  } catch (err) {
    console.warn('[Global Media Keys] Failed to register global shortcuts:', err);
  }
}

/**
 * Unregisters global media shortcuts on app shutdown
 */
export function unregisterGlobalMediaShortcuts(): void {
  try {
    globalShortcut.unregister('MediaPlayPause');
    globalShortcut.unregister('MediaNextTrack');
    globalShortcut.unregister('MediaPreviousTrack');
    globalShortcut.unregister('MediaStop');
    console.log('[Global Media Keys] Unregistered hardware media keys.');
  } catch {}
}
