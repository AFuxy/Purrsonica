import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import QRCode from 'qrcode';
import { BrowserWindow, app } from 'electron';
import {
  getTrackById,
  queryTracks,
  getPlaylists,
  upsertCompanionDevice,
  getCompanionDeviceByTokenHash,
  listCompanionDevices,
  updateCompanionDeviceHeartbeat,
  updateCompanionDeviceActiveStatus,
  setAllCompanionDevicesInactive,
  deleteCompanionDevice,
  getScanSettings,
} from '../db/queries.js';
import {
  CompanionDevice,
  CompanionServerStatus,
  CompanionPairingSession,
  RemotePlaybackCommand,
  MobilePlaybackState,
} from '../../shared/types.js';

let httpServer: http.Server | null = null;
let wss: WebSocketServer | null = null;
let currentPort = 51820;
let targetMainWindow: BrowserWindow | null = null;

// Map of active connected sockets keyed by deviceId
const activeSockets = new Map<string, WebSocket>();

// Active pairing session (only 1 active pairing session at a time, expires in 5 mins)
let activePairingSession: {
  pairingToken: string;
  expiresAt: number;
} | null = null;

// Persistent server fingerprint (computed once per install)
let serverFingerprint = '';

export function getServerFingerprint(): string {
  if (serverFingerprint) return serverFingerprint;
  const seed = `${os.hostname()}_${os.platform()}_${app.getPath('userData')}`;
  serverFingerprint = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
  return serverFingerprint;
}

export function getLocalIPv4Addresses(): string[] {
  const interfaces = os.networkInterfaces();
  const scoredAddresses: { address: string; score: number }[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    const lowerName = name.toLowerCase();

    for (const net of netList) {
      // IPv4 and not internal 127.0.0.1 loopback
      if (net.family === 'IPv4' && !net.internal) {
        const ip = net.address;
        // Skip unconfigured link-local addresses
        if (ip.startsWith('169.254.')) continue;

        let score = 50;

        // Prioritize physical network adapters (Wi-Fi, Ethernet)
        if (/wi-?fi|wlan|wireless|airport/i.test(lowerName)) {
          score += 50;
        } else if (/ethernet|eth\d*|en\d*/i.test(lowerName)) {
          score += 40;
        }

        // Deprioritize virtual, container, and hypervisor interfaces
        if (/vethernet|hyper-?v|wsl|virtualbox|vbox|vmware|docker|virbr|bridge/i.test(lowerName)) {
          score -= 45;
        }

        // Standard home private subnets (192.168.x.x, 10.x.x.x) are preferred for phone-to-PC connections
        if (ip.startsWith('192.168.')) {
          score += 30;
        } else if (ip.startsWith('10.')) {
          score += 20;
        } else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) {
          score += 10;
        }

        scoredAddresses.push({ address: ip, score });
      }
    }
  }

  // Sort by highest score first
  scoredAddresses.sort((a, b) => b.score - a.score);

  const addresses = scoredAddresses.map((entry) => entry.address);

  // If no network interfaces found, fallback to localhost
  if (addresses.length === 0) {
    addresses.push('127.0.0.1');
  }

  return addresses;
}

export function isPrivateOrLoopbackIP(rawIp?: string): boolean {
  if (!rawIp) return false;
  const ip = rawIp.replace(/^::ffff:/, '').trim();

  // Localhost (IPv6 / IPv4)
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return true;
  }

  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;

  // 172.16.0.0/12
  const match172 = ip.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) return true;
  }

  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;

  // Link-Local (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;

  // Tailscale / Carrier CGNAT mesh (100.64.0.0/10)
  const match100 = ip.match(/^100\.(\d+)\./);
  if (match100) {
    const octet = parseInt(match100[1], 10);
    if (octet >= 64 && octet <= 127) return true;
  }

  return false;
}

export function getCompanionServerStatus(): CompanionServerStatus {
  const devices = listCompanionDevices();
  const settings = getScanSettings();
  return {
    isRunning: httpServer !== null && httpServer.listening,
    port: currentPort,
    localIps: getLocalIPv4Addresses(),
    serverName: os.hostname(),
    activeDeviceCount: activeSockets.size,
    pairedDeviceCount: devices.length,
    allowOutsideLan: Boolean(settings.allowOutsideLan),
  };
}

export async function createPairingSession(): Promise<CompanionPairingSession> {
  const pairingToken = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  activePairingSession = {
    pairingToken,
    expiresAt,
  };

  const localIps = getLocalIPv4Addresses();
  const settings = getScanSettings();
  const allowOutsideLan = Boolean(settings.allowOutsideLan);

  const payload = {
    version: 1,
    serverName: os.hostname(),
    localIps,
    port: currentPort,
    pairingToken,
    fingerprint: getServerFingerprint(),
    expiresAt,
    allowOutsideLan,
  };

  const jsonStr = JSON.stringify(payload);
  const qrCodeDataUrl = await QRCode.toDataURL(jsonStr, {
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    width: 320,
  });

  return {
    pairingToken,
    qrCodeDataUrl,
    port: currentPort,
    localIps,
    serverName: os.hostname(),
    expiresAt,
    allowOutsideLan,
  };
}

// Authentication helper: validates bearer token from request
function authenticateRequest(req: http.IncomingMessage): (CompanionDevice & { auth_token_hash: string }) | null {
  let token = '';

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, `http://localhost:${currentPort}`);
      token = parsedUrl.searchParams.get('token') || '';
    } catch {}
  }

  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const device = getCompanionDeviceByTokenHash(tokenHash);

    if (device) {
      // Update heartbeat and IP
      const clientIp = req.socket.remoteAddress?.replace(/^.*:/, '') || undefined;
      updateCompanionDeviceHeartbeat(device.id, clientIp);
      return device;
    }
  }

  // Fallback for media streams from already paired active LAN devices
  const clientIp = req.socket.remoteAddress?.replace(/^.*:/, '') || '';
  if (clientIp && isPrivateOrLoopbackIP(clientIp)) {
    const devices = listCompanionDevices();
    const matchingDevice = devices.find((d) => d.is_active && (d.ip_address === clientIp || !d.ip_address));
    if (matchingDevice) {
      return matchingDevice as any;
    }
  }

  return null;
}

// Broadcast message to all connected companion devices
export function broadcastToCompanions(type: string, payload: any): void {
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });
  for (const [deviceId, ws] of activeSockets.entries()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    } else {
      activeSockets.delete(deviceId);
      updateCompanionDeviceActiveStatus(deviceId, false);
    }
  }
}

let latestThemeData: { accentColor: string; accentPreset: string; theme: string } = {
  accentColor: '#10b981',
  accentPreset: 'emerald',
  theme: 'dark',
};

export function setLatestCompanionTheme(themeData: { accentColor: string; accentPreset: string; theme: string }): void {
  latestThemeData = { ...latestThemeData, ...themeData };
  broadcastToCompanions('THEME_UPDATE', latestThemeData);
}

// Handle HTTP API requests
function handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Security Check: Enforce local LAN restriction unless Out-of-LAN mode is explicitly enabled
  const clientIp = req.socket.remoteAddress || '';
  const settings = getScanSettings();
  const isOutsideLanAllowed = Boolean(settings.allowOutsideLan);

  if (!isOutsideLanAllowed && !isPrivateOrLoopbackIP(clientIp)) {
    console.warn(`[Companion Server] Blocked outside-LAN HTTP request from ${clientIp} (Out-of-LAN mode is disabled)`);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Forbidden: Out-of-LAN remote streaming is disabled in Desktop Settings.',
      code: 'OUTSIDE_LAN_DISABLED',
    }));
    return;
  }

  const reqUrl = req.url || '/';
  const urlObj = new URL(reqUrl, `http://localhost:${currentPort}`);
  const pathname = urlObj.pathname;

  // --- Public Ping ---
  if (pathname === '/api/v1/ping' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      serverName: os.hostname(),
      version: app.getVersion(),
      fingerprint: getServerFingerprint(),
      activeDevices: activeSockets.size,
    }));
    return;
  }

  // --- Pairing Handshake ---
  if (pathname === '/api/v1/pair' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Prevent flood
      if (body.length > 100000) req.destroy();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { pairingToken, deviceId, deviceName, platform, model } = data;

        if (!pairingToken || !deviceId || !deviceName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields (pairingToken, deviceId, deviceName)' }));
          return;
        }

        if (!activePairingSession || activePairingSession.expiresAt < Date.now() || activePairingSession.pairingToken !== pairingToken) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Pairing session is invalid or expired. Please scan fresh QR code.' }));
          return;
        }

        // Generate permanent cryptographically secure auth token
        const permanentAuthToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(permanentAuthToken).digest('hex');
        const clientIp = req.socket.remoteAddress?.replace(/^.*:/, '') || undefined;

        upsertCompanionDevice({
          id: deviceId,
          name: deviceName,
          platform: platform || 'ios',
          model: model || undefined,
          authTokenHash: tokenHash,
          ipAddress: clientIp,
        });

        // Invalidate used pairing session
        activePairingSession = null;

        // Notify desktop renderer
        if (targetMainWindow && !targetMainWindow.isDestroyed()) {
          targetMainWindow.webContents.send('companion:device-paired', {
            id: deviceId,
            name: deviceName,
            platform,
            model,
          });
        }

        console.log(`[Companion Server] Successfully paired device: "${deviceName}" (${deviceId})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          success: true,
          token: permanentAuthToken,
          authToken: permanentAuthToken,
          deviceId,
          serverName: os.hostname(),
          fingerprint: getServerFingerprint(),
          version: app.getVersion(),
        }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // --- Authenticated Endpoints below ---
  const device = authenticateRequest(req);
  if (!device) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Missing or invalid companion token' }));
    return;
  }

  // --- Library Tracks Query ---
  if (pathname === '/api/v1/library/tracks' && req.method === 'GET') {
    const search = urlObj.searchParams.get('search') || undefined;
    const playlistId = urlObj.searchParams.get('playlistId') || undefined;
    const album = urlObj.searchParams.get('album') || undefined;
    const artist = urlObj.searchParams.get('artist') || undefined;
    const isLiked = urlObj.searchParams.get('isLiked') === 'true' ? true : undefined;
    const limit = parseInt(urlObj.searchParams.get('limit') || '50000', 10);
    const offset = parseInt(urlObj.searchParams.get('offset') || '0', 10);

    const result = queryTracks({
      search,
      playlistId,
      album,
      artist,
      isLiked,
      limit,
      offset,
      sortBy: 'title',
      sortOrder: 'ASC',
    });

    // Map to lightweight mobile format
    const tracks = result.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      bpm: t.bpm,
      musical_key: t.musical_key,
      camelot_key: t.camelot_key,
      format: t.format,
      bitrate: t.bitrate,
      is_liked: t.is_liked,
      has_cover: !!t.cover_art_path,
    }));

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ tracks, total: result.total }));
    return;
  }

  // --- Library Playlists Query ---
  if (pathname === '/api/v1/library/playlists' && req.method === 'GET') {
    const playlists = getPlaylists();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ playlists }));
    return;
  }

  // --- Track Artwork Endpoint ---
  if (pathname.startsWith('/api/v1/art/') && req.method === 'GET') {
    const trackId = pathname.replace('/api/v1/art/', '').trim();
    const track = getTrackById(trackId);

    if (track && track.cover_art_path && fs.existsSync(track.cover_art_path)) {
      const ext = path.extname(track.cover_art_path).toLowerCase();
      const mime = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';

      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400, immutable',
      });
      fs.createReadStream(track.cover_art_path).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Cover art not found');
    return;
  }

  // --- Audio Stream Endpoint (HTTP 206 Partial Content Range Streaming) ---
  if (pathname.startsWith('/api/v1/stream/') && req.method === 'GET') {
    const trackId = pathname.replace('/api/v1/stream/', '').trim();
    const track = getTrackById(trackId);

    if (!track || !fs.existsSync(track.file_path)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Audio file not found');
      return;
    }

    const filePath = track.file_path;
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('File read error');
      return;
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    // Detect MIME type
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.flac': 'audio/flac',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/opus',
    };
    const contentType = mimeMap[ext] || 'audio/mpeg';

    if (range) {
      // Parse Range header e.g. "bytes=1048576-"
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
        });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      fileStream.pipe(res);
    } else {
      // Full file stream
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
}

export function startCompanionServer(mainWindow: BrowserWindow, requestedPort = 51820): Promise<CompanionServerStatus> {
  targetMainWindow = mainWindow;

  return new Promise((resolve, reject) => {
    if (httpServer && httpServer.listening) {
      resolve(getCompanionServerStatus());
      return;
    }

    currentPort = requestedPort;
    httpServer = http.createServer((req, res) => handleHttpRequest(req, res));

    // WebSocket Server attached to same port
    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      // Security Check: Enforce local LAN restriction unless Out-of-LAN mode is explicitly enabled
      const clientIp = req.socket.remoteAddress || '';
      const settings = getScanSettings();
      const isOutsideLanAllowed = Boolean(settings.allowOutsideLan);

      if (!isOutsideLanAllowed && !isPrivateOrLoopbackIP(clientIp)) {
        console.warn(`[Companion WS] Blocked outside-LAN WebSocket connection from ${clientIp} (Out-of-LAN mode is disabled)`);
        ws.close(4403, 'Out-of-LAN Remote Streaming is disabled in Desktop Settings');
        return;
      }

      const device = authenticateRequest(req);
      if (!device) {
        console.warn('[Companion WS] Unauthorized connection attempt closed');
        ws.close(4401, 'Unauthorized');
        return;
      }

      const deviceId = device.id;
      const prevWs = activeSockets.get(deviceId);
      if (prevWs && prevWs !== ws) {
        try {
          prevWs.close(1000, 'Replaced by new connection');
        } catch {}
      }
      activeSockets.set(deviceId, ws);
      updateCompanionDeviceActiveStatus(deviceId, true);

      console.log(`[Companion WS] Device connected: "${device.name}" (${deviceId})`);

      // Notify desktop renderer of new active connection
      if (targetMainWindow && !targetMainWindow.isDestroyed()) {
        targetMainWindow.webContents.send('companion:device-connected', device);
      }

      // Send welcome handshake
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: {
          serverName: os.hostname(),
          version: app.getVersion(),
          timestamp: Date.now(),
        },
      }));

      // Immediately sync current desktop theme
      ws.send(JSON.stringify({
        type: 'THEME_UPDATE',
        payload: latestThemeData,
      }));

      ws.on('message', (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
            updateCompanionDeviceHeartbeat(deviceId);
          } else if (msg.type === 'DEVICE_INFO') {
            const { name, model, platform } = msg.payload || {};
            if (name || model) {
              const updatedName = name || device.name;
              const updatedModel = model || device.model;
              const updatedPlatform = platform || device.platform;
              upsertCompanionDevice({
                id: deviceId,
                name: updatedName,
                model: updatedModel,
                platform: updatedPlatform,
                authTokenHash: device.auth_token_hash,
                ipAddress: req.socket.remoteAddress?.replace(/^.*:/, '') || device.ip_address,
              });
              device.name = updatedName;
              device.model = updatedModel;
              device.platform = updatedPlatform;
              if (targetMainWindow && !targetMainWindow.isDestroyed()) {
                targetMainWindow.webContents.send('companion:device-connected', {
                  ...device,
                  name: updatedName,
                  model: updatedModel,
                  platform: updatedPlatform,
                  is_active: true,
                });
              }
            }
          } else if (msg.type === 'REMOTE_COMMAND') {
            // Forward remote control commands from phone to desktop player
            if (targetMainWindow && !targetMainWindow.isDestroyed()) {
              targetMainWindow.webContents.send('companion:remote-command', msg.payload as RemotePlaybackCommand);
            }
          } else if (msg.type === 'MOBILE_PLAYBACK_STATE') {
            // Forward phone playback state to desktop ("Now playing on Zak's Phone")
            if (targetMainWindow && !targetMainWindow.isDestroyed()) {
              const mobileState = (msg.payload || {}) as MobilePlaybackState;
              targetMainWindow.webContents.send('companion:mobile-playback-state', {
                ...mobileState,
                deviceId,
                deviceName: device.name || mobileState.deviceName,
                trackArtist: mobileState.trackArtist || (mobileState as any).artist,
                artist: (mobileState as any).artist || mobileState.trackArtist,
              });
            }
          }
        } catch (err) {
          console.warn('[Companion WS] Bad message format:', err);
        }
      });

      ws.on('close', () => {
        if (activeSockets.get(deviceId) === ws) {
          activeSockets.delete(deviceId);
          updateCompanionDeviceActiveStatus(deviceId, false);
          console.log(`[Companion WS] Device disconnected: "${device.name}" (${deviceId})`);

          if (targetMainWindow && !targetMainWindow.isDestroyed()) {
            targetMainWindow.webContents.send('companion:device-disconnected', device);
          }
        }
      });

      ws.on('error', (err) => {
        console.warn(`[Companion WS] Socket error for ${device.name}:`, err);
      });
    });

    httpServer.listen(currentPort, '0.0.0.0', () => {
      console.log(`[Companion Server] Purrsonica Companion Server listening on port ${currentPort}`);
      console.log(`[Companion Server] Local IP addresses:`, getLocalIPv4Addresses().join(', '));
      resolve(getCompanionServerStatus());
    });

    httpServer.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Companion Server] Port ${currentPort} in use, trying ${currentPort + 1}...`);
        currentPort++;
        httpServer?.listen(currentPort, '0.0.0.0');
      } else {
        console.error('[Companion Server] Server failed to start:', err);
        reject(err);
      }
    });
  });
}

export function stopCompanionServer(): Promise<void> {
  return new Promise((resolve) => {
    // Disconnect all sockets
    for (const [deviceId, ws] of activeSockets.entries()) {
      ws.close(1000, 'Server shutting down');
    }
    activeSockets.clear();
    setAllCompanionDevicesInactive();

    if (wss) {
      wss.close();
      wss = null;
    }

    if (httpServer) {
      httpServer.close(() => {
        console.log('[Companion Server] Server stopped');
        httpServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Disconnect a specific companion device
export function disconnectCompanionDevice(id: string): boolean {
  const ws = activeSockets.get(id);
  if (ws) {
    ws.close(1000, 'Kicked by host');
    activeSockets.delete(id);
    updateCompanionDeviceActiveStatus(id, false);
    return true;
  }
  return false;
}

// Revoke a device permanently
export function revokeCompanionDevice(id: string): boolean {
  disconnectCompanionDevice(id);
  deleteCompanionDevice(id);
  return true;
}

// Send a remote playback command to a specific connected companion or all companions
export function sendCommandToCompanion(command: RemotePlaybackCommand, deviceId?: string): boolean {
  if (deviceId) {
    const ws = activeSockets.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'REMOTE_COMMAND', payload: command }));
        return true;
      } catch {}
    }
    return false;
  }
  broadcastToCompanions('REMOTE_COMMAND', command);
  return true;
}

