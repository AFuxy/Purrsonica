import { create } from 'zustand';
import { ThemeMode } from '../../shared/types.js';

interface ThemeState {
  theme: ThemeMode;
  logoPath: string;
  iconPath: string;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme: ThemeMode = (localStorage.getItem('purrsonica_theme') as ThemeMode) || 'dark';

  // Apply to document
  if (typeof document !== 'undefined') {
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }

  // Update window icon if available
  if (typeof window !== 'undefined' && window.api?.setThemeIcon) {
    window.api.setThemeIcon(initialTheme);
  }

  return {
    theme: initialTheme,
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
  };
});
