import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let splashWindow: BrowserWindow | null = null;
let isSplashDismissed = false;

function resolveLogoBase64(): string {
  const candidates = [
    path.join(__dirname, '../../public/PurrSonica-White.png'),
    path.join(app.getAppPath(), 'public/PurrSonica-White.png'),
    path.join(process.resourcesPath, 'public/PurrSonica-White.png'),
    path.join(process.resourcesPath, 'app.asar/public/PurrSonica-White.png'),
    path.join(process.cwd(), 'public/PurrSonica-White.png'),
    path.join(process.cwd(), 'PurrSonica-White.png'),
  ];

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        const buf = fs.readFileSync(c);
        return `data:image/png;base64,${buf.toString('base64')}`;
      }
    } catch {}
  }
  return '';
}

function getSplashHtml(): string {
  const logoDataUri = resolveLogoBase64();
  const version = app.getVersion();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    .splash-card {
      width: 440px;
      height: 220px;
      background: #141414;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 28px 36px 22px;
      position: relative;
    }
    .version-tag {
      position: absolute;
      top: 12px;
      right: 16px;
      font-size: 9px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 0.5px;
    }
    .logo-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    .logo {
      max-width: 290px;
      height: auto;
      object-fit: contain;
      animation: gentlePulse 2.4s ease-in-out infinite alternate;
    }
    @keyframes gentlePulse {
      0% {
        opacity: 0.85;
        transform: scale(0.99);
      }
      100% {
        opacity: 1;
        transform: scale(1.01);
      }
    }
    .progress-section {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 500;
      color: #9ca3af;
    }
    .status-message {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status-percent {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #10b981;
      font-weight: 700;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 9999px;
      transition: width 0.25s ease-out;
    }
    .indeterminate {
      width: 40% !important;
      animation: shimmer 1.4s infinite ease-in-out;
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }
  </style>
</head>
<body>
  <div class="splash-card">
    <div class="version-tag">v${version}</div>
    <div class="logo-container">
      <img class="logo" src="${logoDataUri}" alt="Purrsonica" />
    </div>
    <div class="progress-section">
      <div class="status-row">
        <span class="status-message" id="status-msg">Starting engine...</span>
        <span class="status-percent" id="status-pct"></span>
      </div>
      <div class="progress-track">
        <div class="progress-bar indeterminate" id="progress-bar"></div>
      </div>
    </div>
  </div>
  <script>
    window.setStatus = function(msg, pct) {
      const msgEl = document.getElementById('status-msg');
      const bar = document.getElementById('progress-bar');
      const pctEl = document.getElementById('status-pct');
      if (msgEl) msgEl.innerText = msg;
      if (pct !== null && pct !== undefined && pct >= 0 && pct <= 100) {
        bar.classList.remove('indeterminate');
        bar.style.width = pct + '%';
        if (pctEl) pctEl.innerText = Math.round(pct) + '%';
      } else {
        bar.classList.add('indeterminate');
        if (pctEl) pctEl.innerText = '';
      }
    };
  </script>
</body>
</html>`;
}

export function showSplashWindow(): BrowserWindow {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return splashWindow;
  }

  isSplashDismissed = false;

  splashWindow = new BrowserWindow({
    width: 480,
    height: 260,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const html = getSplashHtml();
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  splashWindow.once('ready-to-show', () => {
    if (!isSplashDismissed && splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
    }
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

export function updateSplashStatus(message: string, percent: number | null = null): void {
  if (!splashWindow || splashWindow.isDestroyed() || isSplashDismissed) return;
  const safeMessage = JSON.stringify(message);
  const safePercent = percent === null ? 'null' : percent;
  splashWindow.webContents
    .executeJavaScript(`window.setStatus && window.setStatus(${safeMessage}, ${safePercent});`)
    .catch(() => {});
}

export function closeSplashWindow(mainWindow: BrowserWindow | null): void {
  if (isSplashDismissed) return;
  isSplashDismissed = true;

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }

  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
  }
}
