# Purrsonica

A modern local music and video player for Windows, macOS, and Linux with high-throughput background scanning, interactive waveform scrubbers, DJ Camelot wheel harmonic analysis, Discord Rich Presence, and customizable accent themes.

---

## Downloads

Download the latest release for **Windows**, **macOS**, or **Linux** from the [GitHub Releases page](https://github.com/AFuxy/Purrsonica/releases/latest).

* **Windows**: Installer (`.exe`) and standalone Portable (`.exe`).
* **macOS**: Apple Silicon (M1/M2/M3/M4) & Intel Universal DMG (`.dmg`) and ZIP archive (`.zip`).
* **Linux**: Universal AppImage (`.AppImage`), Debian package (`.deb`), and Tarball (`.tar.gz`).

---

## Key Features

- **Multi-Platform Support**: Tailored native experience across Windows, macOS (with native traffic light window buttons), and Linux.
- **High-Throughput Ghost Windowing**: Lightning-fast instant page switching and smooth virtual scrolling across massive libraries (50,000+ tracks).
- **Background Storage Scanner**: Fast, multi-threaded worker scanner with smart exclusion rules (games, dev dependencies, and OS system caches).
- **Discord Rich Presence (RPC)**: Live profile status broadcasting active song, artist, album, live countdown timer, and repository action buttons.
- **Custom Accent Themes**: 7 signature palettes + hex color wheel picker with live DOM theme engine.
- **Interactive Waveform Scrubbing**: Visual audio waveforms with seekable progress bars and smooth track transitions.
- **DJ Camelot Wheel Analysis**: Automatic key parsing and interactive Camelot Wheel harmonic compatibility matrix (`1A`–`12B`).
- **Global System Media Keys**: Hardware media key control (Play/Pause, Next, Previous, Stop) even when minimized in the background.

---

## Quick Start Guide

### Adding Music to Your Library
- **Drag and Drop**: Drag audio or video files (or entire folders) from your file manager (Explorer, Finder, Nautilus) directly into Purrsonica.
- **Scan Drives**: Click **Scan Library** in the sidebar to scan physical drives or mounted volumes in a background worker thread.
- **Manual Import**: Use the **Import Files** or **Import Folder** buttons in the sidebar to select local directories.

### Playlists
- Click the **+** button next to Playlists in the sidebar to create a new playlist.
- Open a playlist and click the **Pencil icon** or the artwork tile to rename, add a description, or upload custom cover images.
- Add songs by clicking the three-dot menu (`•••`) on any track row.

### Metadata & Camelot Key Editing
- Click `•••` on any track and select **Edit Track Info**.
- Edit track tags (Title, Artist, Album, Year, Genre) and upload custom artwork.
- Use the interactive **Camelot Wheel Picker** to assign musical keys (`1A`–`12B`) and view harmonically compatible keys for DJ mixing.
- Changes can be saved to the local database and optionally written back into physical ID3 file tags.

---

## Building from Source

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- Windows 10/11, macOS 11+, or Linux (Ubuntu/Debian/Fedora/Arch)

### Setup
```bash
# Clone the repository
git clone https://github.com/AFuxy/Purrsonica.git
cd Purrsonica

# Install dependencies
npm install

# Rebuild native SQLite module for Electron
npm run rebuild
```

### Running in Development
```bash
npm run dev
```

### Packaging Binaries
```bash
# Build for Windows (.exe installer & portable)
npm run build:win

# Build for macOS (.dmg & .zip)
npm run build:mac

# Build for Linux (.AppImage, .deb, .tar.gz)
npm run build:linux

# Build for all platforms
npm run build:all
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
