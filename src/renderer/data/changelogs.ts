export interface ChangelogRelease {
  version: string;
  title: string;
  isLatest?: boolean;
  sections: {
    heading: string;
    items: string[];
  }[];
}

export const APP_CHANGELOGS: ChangelogRelease[] = [
  {
    version: '1.2.0',
    title: 'Discord Rich Presence (RPC) & Custom Accent Color Themes',
    isLatest: true,
    sections: [
      {
        heading: 'New Features & Integrations',
        items: [
          'Discord Rich Presence (RPC): Automatically broadcasts your currently playing song, artist, album, live playback countdown timer, and play/pause status directly to your Discord profile activity.',
          'Custom Accent Color Picker & Presets: Customize Purrsonica with tailored signature palettes (Cyberpunk Purple, Sapphire Blue, Ruby Red, Sunset Gold, Electric Cyan, Neon Pink) or pick any custom hex color with live preview.',
          'Custom Action Button: Includes an optional link button on your Discord status connecting friends to the Purrsonica repository.',
          'Integrations & Social Settings: Dedicated control center in Settings to toggle Discord Rich Presence on/off and customize button visibility.',
          'Smart Throttling & Silent Reconnection: Intelligent rate-limited updates that automatically and seamlessly reconnect if Discord is launched after Purrsonica.',
        ],
      },
    ],
  },
  {
    version: '1.1.5',
    title: 'Audio Engine Singleton, Video Auto-Play, All Media Ingestion & Session Resume',
    sections: [
      {
        heading: 'Fixes & Enhancements',
        items: [
          'Audio Engine Singleton & Stable Seeking: Rebuilt the audio player as a global singleton service, eliminating dual-instance conflicts that caused waveform scrubbers to flash or reset to 0 in track info view.',
          'Seamless Navigation Playback: Resolved an issue where opening track info or navigating between views reloaded the audio source and paused playback.',
          'Session Timestamp Resume on Launch: Ensured exact playback timestamps are restored when opening Purrsonica, preventing audio initialization from resetting position to 0:00.',
          'Video Player Auto-Play & Controls: Fixed video auto-play on track selection and added interactive timeline scrubbing, hover tooltips, ±10s skipping, and auto-hiding controls overlay.',
          'Full Library Loading in All Media: Removed the 1,000-track query limit so large libraries display all items with smooth virtual scrolling; automatically clears search filters when navigating.',
          'DJ Tags & Camelot Key Recognition: Clarified the scan setting to accurately reflect that Purrsonica extracts embedded BPM/Key tags and maps them to the 1A–12B Camelot Wheel.',
          'Hardware Media Key & MediaSession Sync: Fixed play/pause UI synchronization for keyboard media keys, headsets, and Windows SMTC with valid artwork URL scheme validation.',
        ],
      },
    ],
  },
  {
    version: '1.1.4',
    title: 'Pre-release Channel, Watermark Badge & Beta Updates',
    sections: [
      {
        heading: 'New Features & Enhancements',
        items: [
          'Pre-release & Beta Channel: Added an opt-in toggle in Settings to check for and install pre-release (Beta / Alpha / Canary) builds directly from GitHub Releases.',
          'Pre-release Watermarks: Displays a sleek, animated pill badge in the titlebar and a subtle bottom-right corner watermark whenever running on a pre-release version.',
          'Custom Beta Update Badges: Distinct purple badges and alerts notify users when experimental pre-release builds are downloaded and ready to install.',
          'Intelligent Album & Song Deduplication: Eliminated duplicate album cards across multi-artist tracks and eliminated duplicate songs within album tracklists (caused by duplicate files or multiple folders on disk).',
          'Verify Library & Clean Missing Files: Added a built-in maintenance tool in Settings to verify all indexed paths and prune dead records for moved or deleted files.',
          'Player Bar Album & File Location: Added active Album name (with clickable jump-to-album navigation) and physical file location path (with instant click-to-reveal in File Explorer) directly inside the bottom player bar.',
          'Dedicated Song Play & Info Page: Clicking any song title or artwork opens a rich song hub featuring high-res artwork with ambient blur, acoustic & DJ metrics (BPM, Key, Bitrate, Sample Rate, File Size), full interactive waveform seeking, and quick metadata editing.',
          'Artist Discography View: Clicking any artist name navigates directly to a dedicated Artist View aggregating all songs by that artist.',
        ],
      },
    ],
  },
  {
    version: '1.1.3',
    title: 'Navigation History, Session Resume & Video Engine',
    sections: [
      {
        heading: 'Improvements & Enhancements',
        items: [
          'Back & Forward History Navigation: Browser-style Back (←) and Forward (→) buttons in the titlebar with Alt+Left/Right and mouse button 4/5 support.',
          'Persistent Playback Session: Automatically saves active track, queue, volume, shuffle/repeat modes, and exact timestamp (in seconds) to resume seamlessly on next launch.',
          'Global Maintenance Navbar Pills: Real-time progress pills in the titlebar (Art & Waveforms) visible across all pages with mid-way cancellation (✕) support.',
          'Checkpoint Resume: Smart skip engine skips already-cached tracks on resume so progress is never lost after app closures or crashes.',
          'Seamless Video Player: Removed conflicting native browser video controls, eliminated duplicate audio playback, and enabled continuous background audio.',
          'Instant Video Re-opening: Re-open the video player at the exact current frame from the bottom playback bar, thumbnail, or right sidebar.',
        ],
      },
    ],
  },
  {
    version: '1.1.2',
    title: 'Dynamic Versioning, Navbar Update Pill & Cache Fallback',
    sections: [
      {
        heading: 'Improvements & Enhancements',
        items: [
          'Dynamic Versioning: Application version is synchronized automatically across Settings, Update Center, and Changelogs directly from package.json.',
          'Navbar Update Pill: Replaced the full-width update banner with a sleek, compact pill badge in the titlebar next to the Purrsonica logo.',
          'Cache Synchronization: Fixed stale database paths when clearing cache and added automatic transparent fallback headers to prevent 404 console errors.',
        ],
      },
    ],
  },
  {
    version: '1.1.1',
    title: 'Settings Hub, Audio Streaming & Smart Game Filters',
    sections: [
      {
        heading: 'New Features & Enhancements',
        items: [
          'Settings & Maintenance Hub: Dedicated preferences center for themes (Dark/Light with live tray icon sync), scanner toggles, custom exclusion rules, and live storage metrics.',
          'Maintenance Suite: Built-in tools for re-extracting embedded ID3 & folder artwork and batch generating 128-bar waveforms with real-time progress counters.',
          'Danger Zone Safeguards: Clear thumbnail cache, wipe SQLite library index, or perform a factory reset with 2-step confirmation protection.',
          'Smart Game & SFX Filtering: Automatically skips game stores (Steam, Epic, Riot, GOG, EA, Ubisoft, Battle.net, XboxGames), game engine folders (Unity, Unreal, Godot, Wwise, FMOD), and short untagged SFX (<15s).',
          'Clickable Album Navigation: Clicking any album name across the song list or now playing sidebar jumps directly to that album view.',
          'In-App Release Patch Notes: Built-in changelog viewer in Settings with multi-version GitHub release note parsing.',
        ],
      },
      {
        heading: 'Critical Audio, Media & Waveform Fixes',
        items: [
          'Audio & Media Streaming Fix: Resolved "Failed to load because no supported source was found" with true HTTP 206 Partial Content Range streaming and exact MIME headers.',
          'Windows Protocol Drive Resolver: Query parameter path mapping (media://app/stream?path=... and cover://app/image?path=...) preventing Windows drive letter stripping.',
          'Adaptive Waveform Algorithm: Fixed flat-line ceiling clipping on loud/compressed tracks with adaptive dynamic range scaling (^0.75 curve) and dynamic 8KB chunk sizing.',
          'Full-Screen Scrolling: Settings and Albums view now scroll smoothly across 100% of the window width with proper bottom padding.',
        ],
      },
    ],
  },
  {
    version: '1.0.2',
    title: 'Performance & Media Fixes',
    sections: [
      {
        heading: 'Performance Optimizations',
        items: [
          'Virtual Scrolling Engine: Implemented virtual windowing in the track table to render only visible items, unlocking smooth 60+ FPS scrolling for 100,000+ tracks.',
          'Throttled Telemetry: Optimized crawler worker batch size to 100 tracks and throttled IPC update broadcasts to eliminate UI stuttering during scans.',
          'SQLite Performance Tuning: Enabled 256MB memory mapping (mmap_size) and 64MB cache in WAL mode, with compound indexes on drive, media type, and liked collections.',
          'Search Debouncing: Added input debouncing in the global search bar to prevent unnecessary query spamming.',
        ],
      },
      {
        heading: 'Media & Artwork Fixes',
        items: [
          'Windows Protocol Drive Resolver: Fixed custom cover:// and media:// protocol URL handling on Windows to preserve drive letters (C:, D:).',
          'Directory Artwork Discovery: Added fallback detection for folder artwork (folder.jpg, cover.jpg, albumart.jpg, front.png) when ID3 tags are missing.',
          'Periodic Update Checks: Added automated 1-hour background check intervals for open instances.',
        ],
      },
    ],
  },
  {
    version: '1.0.1',
    title: 'Installer & Drag-and-Drop Update',
    sections: [
      {
        heading: 'Improvements & Fixes',
        items: [
          'Added NSIS Windows Installer (Purrsonica Setup 1.0.1.exe) for standard installation, desktop shortcut creation, and seamless background auto-updating.',
          'Fixed auto-updater configuration to properly embed app-update.yml and resolve temporary directory exceptions.',
          'Added global drag-and-drop media ingestion: drop audio/video files or folders directly into the app window to index them immediately.',
          'Added drag-and-drop cover artwork uploading in both the Track Metadata Editor and Playlist Editor.',
          'Enhanced playlist management with custom cover art uploading, description editing, and direct track removal.',
          'Upgraded Electron preload bridge to CommonJS for reliable window controls and background scanning.',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    title: 'Initial Release',
    sections: [
      {
        heading: 'Highlights',
        items: [
          'Initial release of Purrsonica desktop media player for Windows.',
          'Multi-threaded disk scanning engine with customizable exclusions and user start/stop controls.',
          'Smart library categorization with drive-specific breakdown (C:, D:), Liked Songs, All Media, and Videos.',
          'Real-time and cached waveform analysis with interactive scrub seeking.',
          'DJ Camelot Wheel harmonic key system (1A–12B) with compatibility matrix and sortable BPM/Key columns.',
          'Track metadata and ID3 tag editor with custom cover artwork uploader.',
          'Custom playlist manager: creation, descriptions, custom artwork, track addition/removal, and reordering.',
          'Frameless interface with full Dark and Light mode theme support.',
        ],
      },
    ],
  },
];
