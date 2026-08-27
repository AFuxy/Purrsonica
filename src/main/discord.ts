import { Client } from '@xhayper/discord-rpc';
import { DiscordPresencePayload } from '../shared/types.js';
import { getScanSettings } from './db/queries.js';

const DISCORD_CLIENT_ID = '1542613080855543868';

let rpcClient: Client | null = null;
let isConnected = false;
let isConnecting = false;
let reconnectTimer: NodeJS.Timeout | null = null;
let lastPresencePayload: DiscordPresencePayload | null = null;
let throttleTimer: NodeJS.Timeout | null = null;
let isEnabled = true;

/**
 * Initializes the Discord RPC connection silently in the background
 */
export function initDiscordRpc(): void {
  const settings = getScanSettings();
  isEnabled = settings.enableDiscordRpc !== false;

  if (!isEnabled) {
    console.log('[Discord RPC] Disabled by user settings.');
    return;
  }

  connectDiscordRpc();
}

/**
 * Establishes IPC connection to Discord desktop client
 */
function connectDiscordRpc(): void {
  if (rpcClient || isConnecting || isConnected) return;

  isConnecting = true;

  try {
    const client = new Client({
      clientId: DISCORD_CLIENT_ID,
    });

    client.on('ready', () => {
      console.log('[Discord RPC] Connected and ready as:', client.user?.username);
      isConnected = true;
      isConnecting = false;

      if (lastPresencePayload) {
        dispatchPresence(lastPresencePayload);
      }
    });

    client.on('disconnected', () => {
      console.log('[Discord RPC] Disconnected from Discord.');
      cleanupConnection();
      scheduleReconnect();
    });

    client.login().catch(() => {
      // Discord is likely closed - fail silently and retry periodically
      cleanupConnection();
      scheduleReconnect();
    });

    rpcClient = client;
  } catch {
    cleanupConnection();
    scheduleReconnect();
  }
}

function cleanupConnection(): void {
  isConnected = false;
  isConnecting = false;
  if (rpcClient) {
    try {
      rpcClient.destroy();
    } catch {}
    rpcClient = null;
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer || !isEnabled) return;
  // Try reconnecting every 15 seconds if Discord was opened later
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (isEnabled && !isConnected && !isConnecting) {
      connectDiscordRpc();
    }
  }, 15000);
}

/**
 * Dispatches an activity payload to Discord
 */
function dispatchPresence(payload: DiscordPresencePayload): void {
  if (!isEnabled || !rpcClient || !isConnected) return;

  const settings = getScanSettings();
  const showButtons = settings.discordRpcShowButtons !== false;

  const { track, isPlaying, currentTime, duration } = payload;

  if (!track) {
    rpcClient.user?.setActivity({
      details: 'Browsing Library',
      state: 'Idle',
      largeImageKey: 'purrsonica_logo',
      largeImageText: 'Purrsonica Music Player',
      smallImageKey: 'idle',
      smallImageText: 'Idle',
      buttons: showButtons
        ? [{ label: 'Get Purrsonica', url: 'https://github.com/AFuxy/Purrsonica' }]
        : undefined,
    }).catch(() => {});
    return;
  }

  const now = Date.now();
  const trackTitle = track.title || track.file_name || 'Unknown Track';
  const trackArtist = track.artist || 'Unknown Artist';
  const trackAlbum = track.album && track.album !== 'Unknown Album' ? track.album : undefined;

  const stateText = trackAlbum ? `by ${trackArtist} • ${trackAlbum}` : `by ${trackArtist}`;

  if (isPlaying) {
    const startTimestamp = Math.floor(now - (currentTime || 0) * 1000);
    const endTimestamp = duration > 0 ? Math.floor(now + (duration - (currentTime || 0)) * 1000) : undefined;

    rpcClient.user?.setActivity({
      details: trackTitle,
      state: stateText.slice(0, 128),
      startTimestamp: new Date(startTimestamp),
      endTimestamp: endTimestamp ? new Date(endTimestamp) : undefined,
      largeImageKey: 'purrsonica_logo',
      largeImageText: trackAlbum || 'Purrsonica',
      smallImageKey: track.media_type === 'video' ? 'video' : 'play',
      smallImageText: track.media_type === 'video' ? 'Watching Video' : 'Playing',
      buttons: showButtons
        ? [{ label: 'Get Purrsonica', url: 'https://github.com/AFuxy/Purrsonica' }]
        : undefined,
    }).catch(() => {});
  } else {
    rpcClient.user?.setActivity({
      details: trackTitle,
      state: `Paused • ${stateText}`.slice(0, 128),
      largeImageKey: 'purrsonica_logo',
      largeImageText: trackAlbum || 'Purrsonica',
      smallImageKey: 'pause',
      smallImageText: 'Paused',
      buttons: showButtons
        ? [{ label: 'Get Purrsonica', url: 'https://github.com/AFuxy/Purrsonica' }]
        : undefined,
    }).catch(() => {});
  }
}

/**
 * Updates Discord Rich Presence with throttling
 */
export function updateDiscordPresence(payload: DiscordPresencePayload): void {
  lastPresencePayload = payload;

  if (!isEnabled) return;

  if (!isConnected && !isConnecting) {
    connectDiscordRpc();
  }

  if (throttleTimer) {
    clearTimeout(throttleTimer);
  }

  // Throttle updates to at most once every 1200ms to stay within Discord rate limits
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    if (lastPresencePayload) {
      dispatchPresence(lastPresencePayload);
    }
  }, 1200);
}

/**
 * Clears Discord Rich Presence
 */
export function clearDiscordPresence(): void {
  lastPresencePayload = null;
  if (rpcClient && isConnected) {
    try {
      rpcClient.user?.clearActivity().catch(() => {});
    } catch {}
  }
}

/**
 * Toggles Discord RPC on or off
 */
export function setDiscordRpcEnabled(enabled: boolean): void {
  isEnabled = enabled;
  if (!enabled) {
    clearDiscordPresence();
    cleanupConnection();
  } else {
    connectDiscordRpc();
    if (lastPresencePayload) {
      dispatchPresence(lastPresencePayload);
    }
  }
}

/**
 * Shuts down RPC on app quit
 */
export function destroyDiscordRpc(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
  clearDiscordPresence();
  cleanupConnection();
}
