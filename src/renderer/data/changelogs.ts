export interface ChangelogRelease {
  version: string;
  title: string;
  isPrerelease?: boolean;
  sections: {
    heading: string;
    items: string[];
  }[];
}

export function isPrereleaseVersion(versionStr?: string): boolean {
  if (!versionStr) return false;
  return /-(alpha|beta|rc|canary|pre|dev|preview)/i.test(versionStr);
}

export interface GitHubReleaseInfo {
  tag_name: string;
  name: string;
  prerelease: boolean;
  draft: boolean;
  published_at: string;
  html_url: string;
}

let cachedGitHubReleases: GitHubReleaseInfo[] | null = null;
let lastFetchTime = 0;

export async function fetchGitHubReleases(): Promise<GitHubReleaseInfo[]> {
  const now = Date.now();
  if (cachedGitHubReleases && now - lastFetchTime < 10 * 60 * 1000) {
    return cachedGitHubReleases;
  }

  try {
    const res = await fetch('https://api.github.com/repos/AFuxy/Purrsonica/releases?per_page=30');
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      cachedGitHubReleases = data.map((r: any) => ({
        tag_name: r.tag_name,
        name: r.name,
        prerelease: !!r.prerelease,
        draft: !!r.draft,
        published_at: r.published_at,
        html_url: r.html_url,
      }));
      lastFetchTime = now;
      return cachedGitHubReleases;
    }
  } catch (err) {
    console.warn('[Changelog] Could not fetch GitHub releases dynamically, using local fallback:', err);
  }

  return cachedGitHubReleases || [];
}

export const APP_CHANGELOGS: ChangelogRelease[] = [
  {
    version: '1.5.0-beta.2',
    title: 'Duplicate Scanner Performance Optimization, Lazy Windowing & Mini-Player Refinements',
    isPrerelease: true,
    sections: [
      {
        heading: 'Improvements & Updates',
        items: [
          'Duplicate Cleaner Performance & Windowing: Implemented component-level memoization, instant O(1) file size lookups, and progressive lazy windowing for fluid 60fps scrolling and instantaneous Select All / Deselect All response.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Single-Pass SQL Duplicate Scanner: Rebuilt duplicate cluster scanner into an atomic single-pass SQL query, eliminating main-thread application freeze on large music libraries.',
          'Mini-Player Header Logo & Full-Width Seekbar: Fixed broken header logo image path in pop-out widget and restructured the mini-player layout with a dedicated full-width seekbar scrubber.',
        ],
      },
    ],
  },
  {
    version: '1.5.0-beta.1',
    title: 'Duplicate File Detector, Global Playlist Drag-and-Drop & Async Library Verification',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'Duplicate File Detector: Scans your entire library across drives to identify identical audio tracks stored in different folders (matching title, artist, and duration).',
          'Global Drag-and-Drop to Playlists: Drag any song from track tables, the bottom playback bar, or the song info page directly onto custom playlists or Liked Songs in the sidebar to add it instantly.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Disk Space Reclaim Engine: Computes total wasted storage per duplicate cluster with side-by-side comparisons of file paths, bitrates, audio formats, and sizes.',
          'Smart Best-Quality Retention: Automatically recommends keeping the highest audio quality/bitrate copy while marking redundant files for removal.',
          'Safe Trash / Recycle Bin Removal: Move redundant files directly to your OS Trash / Recycle Bin with full undo safety.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Zero-Freeze Library Verification: Rebuilt Verify Library & Clean Missing Files with asynchronous chunking and live progress counters, eliminating application freezes and crashes during deep library maintenance.',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    title: 'Floating Mini-Player Widget, Gapless Looping & Channel-Aware Changelogs',
    sections: [
      {
        heading: 'New Features',
        items: [
          'Floating Always-on-Top Mini-Player: A sleek, compact floating widget (380×135px) engineered for gaming, multitasking, and distraction-free daily listening.',
          'Interactive Waveform Scrubber: Live seekable waveform bar with duration timers and glowing accent playback head.',
          'Global Mini-Player Shortcut: Press Ctrl+M (or Cmd+M on macOS) anywhere inside the app to toggle mini-player mode.',
          'Dynamic Channel-Aware Changelogs: Automatically hides experimental beta and pre-release changelogs on live production builds.',
          'One-Click Pre-Release Downgrade System: Seamlessly toggle pre-releases OFF to download and downgrade to the latest stable release.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Visual Channel Badges: Color-coded visual badges for Latest Stable (Emerald) and Pre-Release / Beta (Purple Flame) channels.',
          'Automated CI/CD Pre-Release Detection: Automatic tagging and release categorization across Windows, macOS, and Linux.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Gapless Audio Loop Engine: Native browser-level loop decoders for seamless single-track Repeat One (🔂) and full-queue Repeat All (🔁).',
        ],
      },
    ],
  },
  {
    version: '1.4.0-beta.2',
    title: 'Dynamic Channel-Aware Changelogs & One-Click Downgrade Engine',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'Dynamic Channel-Aware Changelogs: Automatically hides pre-release changelogs on live production builds so standard users only see official releases.',
          'One-Click Pre-Release Downgrade System: Toggle pre-releases OFF to seamlessly download and downgrade back to the latest stable release.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Color-Coded Release Identity: Distinct glowing badges for Latest Stable (Emerald) and Pre-Release / Beta (Purple Flame).',
          'Automated CI/CD Pre-Release Detection: GitHub Actions workflow automatically flags pre-release tags without manual configuration.',
        ],
      },
    ],
  },
  {
    version: '1.4.0-beta.1',
    title: 'Always-on-Top Floating Mini-Player & Gapless Audio Loop Engine',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'Floating Always-on-Top Mini-Player: A sleek, compact floating widget for multitasking, gaming, and working with live scrubbable waveform, DJ key badges, volume flyout, and playback controls.',
          'Instant Window Morphing: Seamlessly transition between full desktop view and floating widget with zero audio interruption.',
          'Global Mini-Player Shortcut: Press Ctrl+M (or Cmd+M on macOS) anywhere inside the app to toggle mini-player mode.',
        ],
      },
      {
        heading: 'Audio Engine Fixes',
        items: [
          'Gapless Single-Track Looping: Fixed Repeat One (🔂) by linking browser-level native loop decoders for seamless repeat playback without stopping.',
          'Full-Queue Looping: Fixed Repeat All (🔁) to accurately preserve the complete track history and replay single-track libraries seamlessly.',
        ],
      },
    ],
  },
  {
    version: '1.3.1',
    title: 'Dynamic Accent Color Engine & Theme Synchronizer',
    sections: [
      {
        heading: 'UI & Theme Fixes',
        items: [
          'Dynamic Accent Engine: Mapped global CSS accent variables across Tailwind color tokens, enabling instantaneous real-time color updates across buttons, waveforms, active tabs, and highlights.',
          'Custom Color Picker Enhancements: Added dedicated Apply Color and Reset buttons for custom hex codes, alongside real-time live preview.',
          'Interactive Waveform Sync: Synchronized playback waveform bars directly with the active accent theme.',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    title: 'Cross-Platform macOS & Linux Support',
    sections: [
      {
        heading: 'Multi-Platform Features',
        items: [
          'Native macOS Support: Dedicated macOS experience with hiddenInset titlebar, native traffic light controls (🔴🟡🟢), and Apple Silicon + Intel DMG/ZIP distribution.',
          'Native Linux Support: Universal AppImage, Debian (.deb), and Tarball (.tar.gz) packages with support for modern Linux desktop environments.',
          'POSIX Volume & Drive Detection: Automatic library and volume resolution for macOS (~/Music, /Volumes) and Linux (/media, /run/media, /mnt).',
          'Platform-Specific File Exclusion Rules: Smart background scanner filters excluding macOS system containers and Linux system partitions.',
        ],
      },
    ],
  },
  {
    version: '1.2.1',
    title: 'Instant Ghost Paging, Zero-Freeze Navigation & Resilient Album Art',
    sections: [
      {
        heading: 'Fixes & Performance Enhancements',
        items: [
          'Instant View Switching: Completely eliminated page-switching freezes when navigating to All Media, Playlists, Drives, or Albums by introducing asynchronous 250-item windowing.',
          'Ghost Virtualization & Infinite Scroll: Track Table renders lightweight skeleton placeholders for instantaneous responsiveness across libraries of 50,000+ songs.',
          'Smart View Query Routing: Prevented non-track views (Albums, Playlists, Settings) from needlessly querying the entire database on navigation.',
          'Resilient Album Art Streaming: Rebuilt cover streaming protocol with dynamic on-the-fly ID3 tag extraction and directory fallback (folder.jpg, cover.jpg), preventing transparent blanks or broken images.',
          'Universal TrackCover Component: Unified album art rendering with automatic error recovery and glowing theme icon fallbacks across all views.',
          'Scan Telemetry Throttling: Eliminated background scan refresh storms from freezing the user interface during deep scans.',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    title: 'Discord Rich Presence, Accent Themes & Global Media Keys',
    sections: [
      {
        heading: 'New Features & Integrations',
        items: [
          'Global System Media Keys: Control Play/Pause, Next Track, and Previous Track using physical keyboard media keys, headsets, and controllers even when Purrsonica is minimized in the background.',
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
