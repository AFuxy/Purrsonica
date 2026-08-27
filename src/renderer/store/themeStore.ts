import { create } from 'zustand';
import { ThemeMode } from '../../shared/types.js';

export interface AccentPreset {
  id: string;
  name: string;
  color: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'emerald', name: 'Emerald Green', color: '#10b981' },
  { id: 'purple', name: 'Cyberpunk Purple', color: '#a855f7' },
  { id: 'blue', name: 'Sapphire Blue', color: '#3b82f6' },
  { id: 'red', name: 'Ruby Red', color: '#ef4444' },
  { id: 'gold', name: 'Sunset Gold', color: '#f59e0b' },
  { id: 'cyan', name: 'Electric Cyan', color: '#06b6d4' },
  { id: 'pink', name: 'Neon Pink', color: '#ec4899' },
];

export function hexToRgba(hex: string, alpha = 0.25): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(16, 185, 129, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function adjustHexBrightness(hex: string, percent: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((char) => char + char).join('');
  }
  let num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyAccentColorToDoc(color: string) {
  if (typeof document === 'undefined') return;
  const hover = adjustHexBrightness(color, -20);
  const glow = hexToRgba(color, 0.25);
  const subtle = hexToRgba(color, 0.12);
  const border = hexToRgba(color, 0.35);

  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-hover', hover);
  document.documentElement.style.setProperty('--accent-glow', glow);
  document.documentElement.style.setProperty('--accent-subtle', subtle);
  document.documentElement.style.setProperty('--accent-border', border);

  // Directly override Tailwind emerald color tokens at runtime
  document.documentElement.style.setProperty('--color-emerald-400', color);
  document.documentElement.style.setProperty('--color-emerald-500', color);
  document.documentElement.style.setProperty('--color-emerald-600', hover);
  document.documentElement.style.setProperty('--color-emerald-300', hover);
  document.documentElement.style.setProperty('--color-emerald-200', hover);
  document.documentElement.style.setProperty('--color-emerald-950', glow);
}

interface ThemeState {
  theme: ThemeMode;
  accentColor: string;
  accentPreset: string;
  logoPath: string;
  iconPath: string;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setAccentColor: (color: string, presetId?: string) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme: ThemeMode = (localStorage.getItem('purrsonica_theme') as ThemeMode) || 'dark';
  const initialAccentColor = localStorage.getItem('purrsonica_accent_color') || '#10b981';
  const initialAccentPreset = localStorage.getItem('purrsonica_accent_preset') || 'emerald';

  // Apply to document
  if (typeof document !== 'undefined') {
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    applyAccentColorToDoc(initialAccentColor);
  }

  // Update window icon if available
  if (typeof window !== 'undefined' && window.api?.setThemeIcon) {
    window.api.setThemeIcon(initialTheme);
  }

  return {
    theme: initialTheme,
    accentColor: initialAccentColor,
    accentPreset: initialAccentPreset,
    logoPath: initialTheme === 'dark' ? './PurrSonica-White.png' : './PurrSonica-Black.png',
    iconPath: initialTheme === 'dark' ? './PurrSonica-White-logo.png' : './PurrSonica-Black-logo.png',
    setTheme: (theme: ThemeMode) => {
      localStorage.setItem('purrsonica_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }

      if (window.api?.setThemeIcon) {
        window.api.setThemeIcon(theme);
      }

      set({
        theme,
        logoPath: theme === 'dark' ? './PurrSonica-White.png' : './PurrSonica-Black.png',
        iconPath: theme === 'dark' ? './PurrSonica-White-logo.png' : './PurrSonica-Black-logo.png',
      });
    },
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },
    setAccentColor: (color: string, presetId = 'custom') => {
      let validHex = color.trim();
      if (!validHex.startsWith('#')) {
        validHex = `#${validHex}`;
      }
      localStorage.setItem('purrsonica_accent_color', validHex);
      localStorage.setItem('purrsonica_accent_preset', presetId);
      applyAccentColorToDoc(validHex);
      set({
        accentColor: validHex,
        accentPreset: presetId,
      });
    },
  };
});
