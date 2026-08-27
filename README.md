# Purrsonica

A local music and video player for Windows with background storage scanning, waveform playback, DJ Camelot wheel key analysis, and playlist management.

---

## Downloads

Download the latest Windows release from the [GitHub Releases page](https://github.com/AFuxy/Purrsonica/releases/latest).

---

## Quick Start Guide

### Adding Music to Your Library
- **Drag and Drop**: Drag audio or video files (or entire folders) from Windows Explorer directly into the application window.
- **Scan Drives**: Click **Scan Library** in the sidebar to scan selected physical drives (e.g. `C:`, `D:`) in a background thread. You can start, stop, and configure exclusion folders at any time.
- **Manual Import**: Use the **Import Files** or **Import Folder** buttons in the sidebar to open native file pickers.

### Playlists
- Click the **+** button next to Playlists in the sidebar to create a new playlist.
- Open a playlist and click the **Pencil icon** or the playlist artwork to rename, add a description, or upload custom cover images.
- Add songs by clicking the three-dot menu (`•••`) on any track row.

### Metadata & Camelot Key Editing
- Click `•••` on any track and select **Edit Track Info**.
- Edit track tags (Title, Artist, Album, Year, Genre) and upload custom artwork.
- Use the interactive **Camelot Wheel Picker** to assign musical keys (`1A`–`12B`) and view harmonically compatible keys for DJ mixing.
- Changes can be saved to the local database and optionally written back into physical ID3 file tags.

### Appearance
- Toggle between Light and Dark mode using the theme button in the top titlebar.

---

## Building from Source

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- Windows 10/11 64-bit

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

### Packaging Windows Executable
```bash
npm run build
```

---

## Publishing Releases

Releases are automated using GitHub Actions:
1. Update `"version"` in `package.json`.
2. Commit changes and push a version tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. GitHub Actions will automatically compile the release and publish it to the GitHub Releases page.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
