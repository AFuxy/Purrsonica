export interface ChangelogItem {
  text: string;
  isExperiment?: boolean;
  flagId?: string;
}

export interface ChangelogSection {
  heading: string;
  isExperiment?: boolean;
  items: (string | ChangelogItem)[];
}

export interface ChangelogRelease {
  version: string;
  title: string;
  isPrerelease?: boolean;
  sections: ChangelogSection[];
}

export interface ParsedChangelogItem {
  title: string;
  description: string;
  isExperiment: boolean;
  flagId?: string;
  experimentLabel: string;
}

export function parseChangelogItem(
  rawItem: string | ChangelogItem,
  sectionIsExperiment?: boolean
): ParsedChangelogItem {
  let text = typeof rawItem === 'string' ? rawItem : rawItem.text;
  let isExperiment = !!sectionIsExperiment || (typeof rawItem === 'object' && !!rawItem.isExperiment);
  let flagId = typeof rawItem === 'object' ? rawItem.flagId : undefined;
  let experimentLabel = 'Experiment';

  // Match leading tag like [Experiment], [Labs], [Experimental]
  const tagMatch = text.match(/^\[(Experiment|Labs|Experimental|Beta Experiment)\]\s*/i);
  if (tagMatch) {
    isExperiment = true;
    experimentLabel = tagMatch[1];
    text = text.slice(tagMatch[0].length);
  } else {
    // Match trailing tag like (Experiment) or (Labs)
    const endMatch = text.trim().match(/\s*\((Experiment|Labs|Experimental)\)$/i);
    if (endMatch) {
      isExperiment = true;
      experimentLabel = endMatch[1];
      text = text.replace(/\s*\((Experiment|Labs|Experimental)\)$/i, '');
    }
  }

  const parts = text.split(': ');
  const title = parts.length > 1 ? parts[0] : '';
  const description = parts.length > 1 ? parts.slice(1).join(': ') : text;

  return {
    title,
    description,
    isExperiment,
    flagId,
    experimentLabel: experimentLabel.charAt(0).toUpperCase() + experimentLabel.slice(1),
  };
}

export function isPrereleaseVersion(versionStr?: string): boolean {
  if (!versionStr) return false;
  return /-(alpha|beta|rc|canary|pre|dev|preview)/i.test(versionStr);
}

export interface ReleaseTagInfo {
  label: string;
  badgeClass: string;
  dotClass: string;
  bulletClass: string;
  borderClass: string;
  isPrerelease: boolean;
}

export function getReleaseTag(versionStr?: string, isPrerelease?: boolean): ReleaseTagInfo | null {
  if (!versionStr) return null;

  const dashIndex = versionStr.indexOf('-');
  if (dashIndex !== -1) {
    const rawSuffix = versionStr.slice(dashIndex + 1).toLowerCase();

    // 1. Beta (e.g., -beta, -beta.1, -beta-2)
    if (/^beta([.-]|$)/i.test(rawSuffix) || rawSuffix === 'beta') {
      return {
        label: 'Beta',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        dotClass: 'bg-purple-400',
        bulletClass: 'text-purple-400',
        borderClass: 'border-purple-500/25',
        isPrerelease: true,
      };
    }

    // 2. Pre-Release (e.g., -prerelease, -pre, -pre-release)
    if (/^pre(-?release)?([.-]|$)/i.test(rawSuffix) || rawSuffix === 'pre' || rawSuffix === 'prerelease') {
      return {
        label: 'Pre Release',
        badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        dotClass: 'bg-indigo-400',
        bulletClass: 'text-indigo-400',
        borderClass: 'border-indigo-500/25',
        isPrerelease: true,
      };
    }

    // 3. Alpha (e.g., -alpha, -alpha.1)
    if (/^alpha([.-]|$)/i.test(rawSuffix) || rawSuffix === 'alpha') {
      return {
        label: 'Alpha',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        dotClass: 'bg-amber-400',
        bulletClass: 'text-amber-400',
        borderClass: 'border-amber-500/25',
        isPrerelease: true,
      };
    }

    // 4. Release Candidate (e.g., -rc, -rc.1)
    if (/^rc([.-]|$)/i.test(rawSuffix) || rawSuffix === 'rc') {
      return {
        label: 'RC',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        dotClass: 'bg-cyan-400',
        bulletClass: 'text-cyan-400',
        borderClass: 'border-cyan-500/25',
        isPrerelease: true,
      };
    }

    // 5. Canary (e.g., -canary)
    if (/^canary([.-]|$)/i.test(rawSuffix) || rawSuffix === 'canary') {
      return {
        label: 'Canary',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        dotClass: 'bg-yellow-400',
        bulletClass: 'text-yellow-400',
        borderClass: 'border-yellow-500/25',
        isPrerelease: true,
      };
    }

    // 6. Dev (e.g., -dev)
    if (/^dev([.-]|$)/i.test(rawSuffix) || rawSuffix === 'dev') {
      return {
        label: 'Dev',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        dotClass: 'bg-rose-400',
        bulletClass: 'text-rose-400',
        borderClass: 'border-rose-500/25',
        isPrerelease: true,
      };
    }

    // 7. Preview (e.g., -preview)
    if (/^preview([.-]|$)/i.test(rawSuffix) || rawSuffix === 'preview') {
      return {
        label: 'Preview',
        badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
        dotClass: 'bg-fuchsia-400',
        bulletClass: 'text-fuchsia-400',
        borderClass: 'border-fuchsia-500/25',
        isPrerelease: true,
      };
    }

    // 8. Nightly (e.g., -nightly)
    if (/^nightly([.-]|$)/i.test(rawSuffix) || rawSuffix === 'nightly') {
      return {
        label: 'Nightly',
        badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
        dotClass: 'bg-teal-400',
        bulletClass: 'text-teal-400',
        borderClass: 'border-teal-500/25',
        isPrerelease: true,
      };
    }

    // 9. Generic Fallback for any other custom suffix
    const cleanWord = rawSuffix.split(/[0-9.]/)[0].replace(/[-_]/g, ' ').trim();
    const formatted = cleanWord
      ? cleanWord
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : 'Pre Release';

    return {
      label: formatted,
      badgeClass: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30',
      dotClass: 'bg-neutral-400',
      bulletClass: 'text-neutral-400',
      borderClass: 'border-neutral-500/25',
      isPrerelease: true,
    };
  }

  // If marked isPrerelease without hyphen
  if (isPrerelease) {
    return {
      label: 'Pre Release',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      dotClass: 'bg-indigo-400',
      bulletClass: 'text-indigo-400',
      borderClass: 'border-indigo-500/25',
      isPrerelease: true,
    };
  }

  return null;
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
    version: '1.6.0-prerelease.3',
    title: 'Frameless Splash Screen, Windows Cache Fix & UI Copy Polish',
    isPrerelease: true,
    sections: [
      {
        heading: 'Improvements & Updates',
        items: [
          'Frameless Startup Splash Screen: Introduces a dedicated, frameless startup window featuring the full Purrsonica text wordmark (PurrSonica-White.png) with a sleek dark card aesthetic (#141414), rounded corners, and gentle breathing animation.',
          'Live Update & Startup Progress: Real-time progress bar embedded directly into the splash screen that tracks update checks and download percentages (0-100%) with an emerald-to-cyan indicator before seamlessly transitioning into the main player window.',
          'Clean Windows Visual Polish: Refined splash window borders and shadows to eliminate colored edge fringing and side glow on Windows DWM, delivering a crisp, modern aesthetic.',
          'Chromium GPU Cache Access Fix: Integrated shader disk cache switch to resolve Chromium "Unable to move the cache: Access is denied (0x5)" and GPU cache creation error notices on Windows systems.',
          'Single-Instance Process Protection: Enforced single-instance application locking to prevent duplicate processes from competing for cache directories and SQLite database access.',
          'Simplified UI Copywriting: Streamlined descriptions, toggles, action cards, and confirmation modal dialogs across Settings to keep interface copy concise and punchy.',
        ],
      },
    ],
  },
  {
    version: '1.6.0-prerelease.2',
    title: 'Silent Background Auto-Updates & Instant Restart',
    isPrerelease: true,
    sections: [
      {
        heading: 'Improvements & Updates',
        items: [
          'Silent Background Auto-Updates: Reconfigured NSIS installer architecture and electron-updater to perform fully silent, headless installs in the background, completely eliminating intermediate wizard setup dialogs.',
          'One-Click Instant Restart: Preserves full user control—updates download in the background with live percentage progress, allowing you to trigger the 1-click "Restart & Install" swap whenever you are ready.',
          'Zero-Elevation Per-User Installation: Configured per-user NSIS architecture to prevent disruptive Windows UAC administrator elevation prompts during background updates.',
        ],
      },
    ],
  },
  {
    version: '1.6.0-prerelease.1',
    title: 'Settings Submenu Navigation Mode & Context-Aware Auto-Collapse',
    isPrerelease: true,
    sections: [
      {
        heading: 'Improvements & Updates',
        items: [
          'Settings Submenu Navigation Mode: Converted the Settings layout into a 3-way feature flag (Off, Tabs, Submenu) in Developer Labs. Submenu mode integrates expandable sub-menu items directly inside the main app sidebar, providing a clean, full-width settings experience without crowded in-page tabs.',
          'Context-Aware Submenu Auto-Collapse: The Settings submenu automatically collapses whenever you navigate away to any other view (All Tracks, Liked Songs, Albums, Videos, DJ Matcher, etc.), keeping your library sidebar compact and focused.',
          'In-Page Accordion Toggle: While inside Settings, clicking the main Settings button toggles the sub-menu open or closed at will.',
        ],
      },
    ],
  },
  {
    version: '1.6.0-beta.4',
    title: 'Universal Multi-Channel Auto-Updater, DJ Hot Cues Alignment & Dynamic Channel Badges',
    isPrerelease: true,
    sections: [
      {
        heading: 'Improvements & Updates',
        items: [
          'Universal Multi-Channel Auto-Updater: Implemented dynamic release channel resolution supporting all pre-release tiers (Beta, Pre-Release, Alpha, RC, Canary, Dev, Preview, and Nightly) to allow seamless cross-channel updates without electron-updater whitelist blocks.',
          'Universal Dynamic Pre-Release & Channel Badges: Synchronized dynamic channel badges (Beta, Pre-Release, Alpha, RC, Canary, Dev) across the Titlebar watermark pill, Settings headers, and app watermark overlay.',
          'Comprehensive Pre-Release Opt-In Clarity: Clarified pre-release channel opt-in settings to explicitly communicate early access across all testing tracks (Beta, Pre-Release, Alpha, RC, Canary).',
          'DJ Suite Titlebar Badge Swing Animation: Added an authentic pendulum swing animation anchored to the top pin of the Titlebar DJ badge when DJ Suite is enabled, featuring responsive hover physics.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Hot Cues Boundary Containment: Resolved an issue where the 4 Hot Cue performance pads exceeded the boundary of the transport module on the DJ Matcher page by enforcing strict sub-column containment, responsive label truncation, and dynamic minimum width constraints.',
          'Transport Cluster Proportions: Balanced CUE and PLAY/PAUSE button footprint to ensure all 4 cue pads remain fully visible and aligned across all desktop and embedded viewports.',
        ],
      },
    ],
  },
  {
    version: '1.6.0-beta.3',
    title: 'Pioneer CDJ CUE Button, One-Click BPM SYNC, Beat Looper Suite, Transition Filter Sweep & DJ Crate Export',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'Pioneer CDJ-Style CUE Button: Full hardware-grade transport controls featuring instant pause-and-snap recall while playing, momentary audition upon hold when paused, primary amber CUE needle flags on the waveform bar, and "C" keyboard shortcut.',
          'One-Click BPM Pitch SYNC: Intelligent pitch synchronizer automatically calculating target offset percent and expanding the pitch fader range (±4%, ±8%, ±16%, ±50%) to match playing tracks to anchor songs, tap-tempo, or matched tracks in 1 click.',
          'Beat-Synchronized Auto Looper: Precision loop suite supporting 1/2, 1, 2, 4, 8, 16, and 32 beats, halve (/2) and double (2x) duration controls, sub-frame 60fps audio turnaround monitor, loop boundary brackets on the waveform bar, and "L" keyboard shortcut.',
          'DJ Transition Filter & Instant Bass Kill: Web Audio Biquad filter pipeline with zipper-noise-free parameter ramping. Includes bi-directional Low-Pass (sweeps highs down to 200 Hz) and High-Pass (sweeps lows up to 5,000 Hz) slider, and a dedicated -36dB Bass Kill stomp button below 250 Hz.',
          'DJ Crate & Rekordbox / Serato USB Export: Universal .m3u8 playlist export equipped with #EXTINF duration, artist and title tags, #EXT-X-PURRSONICA-BPM, #EXT-X-PURRSONICA-KEY, and extended comments for instant plug-and-play compatibility with Pioneer Rekordbox, Serato DJ Pro, Engine DJ (Denon), VirtualDJ, and standalone USB drives.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Full-Width DJ Performance Console: Expanded the DJ Performance Deck to span 100% of the screen width with responsive hardware module scaling, giving the pitch fader, beat looper, and filter sweep generous room to breathe.',
          'Matched Track SYNC Quick-Actions: Added direct 1-click SYNC buttons across all matched song cards in the DJ Matcher view to instantly pitch-match prospective tracks.',
          'Playlist Header DJ Crate Export: Added 1-click DJ Crate export directly inside custom playlist headers when DJ Mode is enabled.',
          'Sub-Frame Audio Turnaround: Implemented requestAnimationFrame audio position monitoring for zero-latency, click-free beat roll looping.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Crossfade Guard During Looping: Prevented background track transition and upcoming track handoffs from triggering while an active beat loop is engaged.',
          'DJ Mode Comprehensive Cleanup: Guaranteed full audio filter neutralization, loop termination, and fader normalization when DJ mode is disabled.',
        ],
      },
    ],
  },
  {
    version: '1.6.0-beta.2',
    title: 'DJ Deck Performance Suite (Pitch Fader, Master Tempo, Hot Cues, Tap-Tempo), Developer Labs & Modern Side-Nav Settings Layout',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'DJ Deck Performance Suite: Integrated hardware-grade DJ performance controls featuring real-time variable pitch slider (±4%, ±8%, ±16%, ±50%), Master Tempo (key-lock) preserving harmonic keys during tempo transitions, momentary pitch-bend nudge buttons, 4 color-coded Hot Cue pads, and live Tap-Tempo BPM calibration.',
          'Hot Cues & Interactive Waveform Markers: 4-pad performance cue system with persistent per-track memory, keyboard shortcuts (1–4, Shift+1–4 to clear, Ctrl+D / Alt+D to toggle deck), and color-coded needle markers drawn directly on the waveform bar.',
          'Live Tap-Tempo BPM Calibration: Precision rhythmic tap calculator with moving-average interval detection, direct one-click track metadata updates, and instant synchronization to the DJ Harmonic Matcher.',
          'Developer Labs & Feature Flag Architecture: Full enterprise-grade feature flag engine allowing seamless experimentation, live parameter tuning, and zero-breakage rollout gating.',
          'Secure DevTools Console Activation: Stealth developer portal unlocked exclusively via console command (purrsonica.enableDevMode) with cryptographic passkey rotation and auto-lock security.',
          '[Experiment] Developer Labs UI: Dedicated testing panel with category filters (Audio, DJ, UI, Performance, Connectivity, Experimental), maturity stage badges, JSON config import/export, and instant state overrides.',
          '[Experiment] Modern Vertical Side-Rail Settings Layout: Re-architected the Settings hub into a scalable two-column layout featuring a vertical left navigation rail with grouped categories (Preferences, System & Maintenance, Danger).',
          'Global Deep-Linking & Persistent Tab Memory: Any element in the app can direct-route to specific Settings tabs (e.g., Titlebar DJ badge routes to DJ Suite, live maintenance task pills route to Maintenance, update pills route to System & Updates). Remembers your active tab across sessions.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'DJ Matcher Performance Deck: Embedded the live DJ Performance Deck directly inside the DJ Harmonic Matcher view for seamless beatmatching and track preparation.',
          'DJ Mode UI Isolation & Automatic Tempo Reset: All DJ performance tools (deck drawer, waveform cue flags, keyboard shortcuts) are strictly isolated to DJ mode, and turning off DJ mode automatically resets tempo modifications back to standard 1.0x playback.',
          'Case-Resilient Feature Flag Lookup: Dynamic flag resolver engine synchronizes dictionary keys, flag identifiers, and localStorage overrides with real-time reactivity.',
          'Classic Layout Preservation: Full backward compatibility preserving the original single-page scroll experience when the Tabbed Settings flag is disabled.',
          'Multi-Version Changelog Accordion: Enhanced changelog history with current version indicators, dynamic channel tags, experiment badges, and instant collapsible release notes.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Library Size Metric Formatting: Corrected calculation in Settings where total audio duration in seconds was erroneously formatted with file size units instead of total library byte volume.',
          'Waveform Store Selector Stability: Fixed an unstable object reference in audio waveform store selectors that triggered infinite re-render loops on startup.',
          'Flag Override Synchronization: Resolved key-casing mismatch between feature flag definitions and override stores, ensuring flags toggle and persist reliably.',
          'Settings Side Navigation Scaling: Eliminated awkward top horizontal scrollbars by transitioning tab navigation to a responsive vertical side rail.',
        ],
      },
    ],
  },
  {
    version: '1.6.0-beta.1',
    title: 'WASM Key & BPM Analyzer, DJ Harmonic Matcher, Gapless Audio Crossfader, Exclusion Cleaner & After-Action Reports',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'On-Demand WASM BPM & Key Analyzer: Integrated high-precision WebAssembly audio DSP engine utilizing 36-bin EDMA harmonic chromagrams and hardware-calibrated 44.1 kHz resampling to calculate exact Camelot keys and tempos.',
          'Single-Track & Batch Library Analysis: Run on-demand tempo and key detection from Song Detail cards, Track Context Menus, the Metadata Editor, or batch re-analyze your library from Settings.',
          'DJ Harmonic Matcher & Mix Assistant: Real-time harmonic mixing hub calculating Camelot Wheel compatibility (±1h, relative major/minor, +1/+2 energy boosts) and BPM tolerance matching (±0%, ±3%, ±5%, ±8%, ±16%, half/double time). Includes instant "Save as DJ Crate" playlist generation and live player sync.',
          'Audio Crossfade Engine (1–10s): Smoothly blends consecutive tracks with equal-power volume curves, adjustable from 0s (Gapless) to 10s in Settings.',
          'Visual Waveform Transition Zones & Live Animations: Highlights active fade-in and fade-out transition windows directly on the waveform bar with purple gradient sweeps, shimmer highlights, and artwork cross-dissolve with live "Blend %" badges.',
          'Seamless Gapless Playback Engine: Dual-deck A/B hardware pipeline with background pre-buffering, 25ms sub-frame monitoring, and 350ms buffer overlap for zero-hitch song-to-song transitions.',
          'Destructive Action Confirmations ("Are You Sure?"): Added sleek confirmation modals before executing long-running or destructive maintenance tasks (Library Verification, Artwork Caching, Waveform Generation, Batch Audio Analysis, Clear Cache).',
          'Non-Intrusive "After-Action" Reports: Added comprehensive Action Reports accessible via persistent "View Report" buttons on maintenance cards, reporting itemized changes, performance stats, and one-click clipboard summaries.',
          'Excluded Folder Library Cleaner: Updated "Verify Library & Clean Missing Files" to detect and purge stale tracks matching newly added Excluded Folders alongside missing files.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Conditional DJ Suite Visibility: Gated all DJ Matcher navigation, context menus, and detail actions strictly behind the "Enable DJ Suite" toggle.',
          'Auto-Detuning Pitch Correction: Key detection automatically measures and compensates for non-standard 440 Hz concert pitch (up to ±50 cents).',
          'Audio-Only Analysis Guard: Strictly filters analysis queues to audio tracks, ignoring video media.',
          'Cross-Player Video Seek Synchronization: Synchronized timeline seeking across the bottom PlaybackBar, WaveformBar, and Video Modal with timeupdate gating during scrubs.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Repeat One Full-Track Loop: Fixed loop restart glitch where tracks looping under Repeat One prematurely triggered crossfade handoffs, ensuring tracks play to 100% completion before seamlessly looping.',
          'WASM Module Bundler Interop: Resolved constructor resolution issues with WebAssembly algorithm bindings in production Vite/Rollup bundles.',
          'Video Scrubber Frame Conflict: Fixed frame timeupdate race conditions that caused the video scrubber to snap back during dragging.',
        ],
      },
    ],
  },
  {
    version: '1.5.0',
    title: 'Duplicate File Cleaner & Disk Reclaimer, Ghost Virtualization, Global Playlist Drag-and-Drop & File Path Search Engine',
    sections: [
      {
        heading: 'New Features',
        items: [
          'Duplicate File Detector & Disk Cleaner: Scans your entire library across drives to identify identical audio tracks stored in different folders (matching title, artist, and duration) with safe OS Trash / Recycle Bin removal.',
          'Global Drag-and-Drop to Playlists: Drag any song from track tables, the playback bar, or song info pages directly onto custom playlists or Liked Songs in the sidebar to add it instantly.',
          'File Path & Folder Search Engine: Search for tracks by full file path, drive letter, or folder directory name directly from the main search bar in the Titlebar.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Ghost Virtualization for Duplicate Cleaner: Full dynamic ghost virtualization with layout offset precomputation, bounding overscan windows, and requestAnimationFrame scroll scheduling—rendering thousands of duplicate files with near-zero DOM overhead.',
          'Disk Space Reclaim Engine: Computes total wasted storage per duplicate cluster with side-by-side comparisons of file paths, bitrates, audio formats, and sizes.',
          'Smart Best-Quality Retention: Automatically recommends keeping the highest audio quality/bitrate copy while marking redundant files for removal.',
          'Smart Sidebar Scan PC Visibility: Automatically hides the prominent "Scan PC" button from the sidebar after your first media scan is completed, keeping the sidebar sleek.',
          'Enhanced Settings Scanner Hub: Added a prominent "Scan Computer for New Media" action card and clear button in Settings > Library & Scanner Preferences.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Single-Pass SQL Duplicate Scanner: Rebuilt duplicate cluster scanner into an atomic single-pass SQL query, eliminating main-thread application freeze on large music libraries.',
          'Zero-Lag Deselect & Selection Scaling: Replaced progressive list appending with true windowed virtualization, eliminating UI freeze and DOM bloat when managing libraries with 4,000+ duplicate files.',
          'Custom Playlist Artwork Persistence: Moved custom user-uploaded playlist and track cover images into a permanent storage directory, preventing them from being wiped during background cache cleanups or app restarts.',
          'Track Drag-and-Drop vs Image Upload Isolation: Added draggable isolation to album artwork images and custom drag data types, preventing internal track drag operations from triggering the full-screen media file upload overlay.',
          'Zero-Freeze Library Verification: Rebuilt Verify Library & Clean Missing Files with asynchronous chunking and live progress counters, eliminating application freezes and crashes during deep library maintenance.',
          'Mini-Player Header Logo & Full-Width Seekbar: Fixed broken header logo image path in pop-out widget and restructured the mini-player layout with a dedicated full-width seekbar scrubber.',
        ],
      },
    ],
  },
  {
    version: '1.5.0-beta.4',
    title: 'File Path Search Engine, Smart Scanner Placement & Settings Scanner Hub',
    isPrerelease: true,
    sections: [
      {
        heading: 'New Features',
        items: [
          'File Path Search Engine: Added full support for searching by file path, folder names, and directory locations in the main search bar.',
        ],
      },
      {
        heading: 'Improvements & Updates',
        items: [
          'Smart Sidebar Scan PC Visibility: Automatically hides the prominent "Scan PC" button from the sidebar after your first media scan is completed, keeping the sidebar sleek.',
          'Enhanced Settings Scanner Hub: Added a prominent "Scan Computer for New Media" action card and clear button in Settings > Library & Scanner Preferences.',
        ],
      },
    ],
  },
  {
    version: '1.5.0-beta.3',
    title: 'Full Ghost Virtualization for Duplicate File Cleaner & High-Capacity Library Scaling',
    isPrerelease: true,
    sections: [
      {
        heading: 'Improvements & Updates',
        items: [
          'Ghost Virtualization for Duplicate Cleaner: Implemented full dynamic ghost virtualization with layout offset precomputation, bounding overscan windows, and requestAnimationFrame scroll scheduling—rendering thousands of duplicate files with near-zero DOM overhead.',
        ],
      },
      {
        heading: 'Bug Fixes',
        items: [
          'Zero-Lag Deselect & Selection Scaling: Replaced progressive list appending with true windowed virtualization, eliminating UI freeze and DOM bloat when managing libraries with 4,000+ duplicate files.',
          'Custom Playlist Artwork Persistence: Moved custom user-uploaded playlist and track cover images into a permanent storage directory, preventing them from being wiped during background cache cleanups or app restarts.',
          'Track Drag-and-Drop vs Image Upload Isolation: Added draggable isolation to album artwork images and custom drag data types, preventing internal track drag operations from triggering the full-screen media file upload overlay.',
        ],
      },
    ],
  },
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
