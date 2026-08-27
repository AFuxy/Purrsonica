import React, { useState } from 'react';
import { X, Upload, Music, Image as ImageIcon, Save, Check } from 'lucide-react';
import { Track, UpdateTrackMetadataPayload } from '../../../shared/types.js';
import { useLibraryStore } from '../../store/libraryStore.js';
import { usePlayerStore } from '../../store/playerStore.js';
import { CamelotWheelPicker } from './CamelotWheelPicker.js';
import { parseKey } from '../../../shared/camelot.js';

interface MetadataEditorModalProps {
  track: Track;
  onClose: () => void;
}

export const MetadataEditorModal: React.FC<MetadataEditorModalProps> = ({ track, onClose }) => {
  const { fetchTracks, setEditingTrack } = useLibraryStore();
  const { updateCurrentTrackMetadata } = usePlayerStore();

  const [title, setTitle] = useState(track.title || '');
  const [artist, setArtist] = useState(track.artist || '');
  const [album, setAlbum] = useState(track.album || '');
  const [genre, setGenre] = useState(track.genre || '');
  const [year, setYear] = useState<string>(track.year ? String(track.year) : '');
  const [trackNumber, setTrackNumber] = useState<string>(track.track_number ? String(track.track_number) : '');
  const [bpm, setBpm] = useState<string>(track.bpm ? String(track.bpm) : '');
  const [camelotKey, setCamelotKey] = useState<string>(track.camelot_key || '');
  const [musicalKey, setMusicalKey] = useState<string>(track.musical_key || '');
  const [coverArtBase64, setCoverArtBase64] = useState<string | null>(null);
  const [previewCoverUrl, setPreviewCoverUrl] = useState<string | null>(
    track.cover_art_path && window.api ? window.api.getCoverUrl(track.cover_art_path) : null
  );
  const [writeToSourceFile, setWriteToSourceFile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSelectCamelot = (camelot: string, musical: string) => {
    setCamelotKey(camelot);
    setMusicalKey(musical);
  };

  const handleManualKeyChange = (val: string) => {
    setMusicalKey(val);
    const parsed = parseKey(val);
    if (parsed) {
      setCamelotKey(parsed.camelot);
    }
  };

  const handlePickImage = async () => {
    if (!window.api) return;
    const base64 = await window.api.pickImage();
    if (base64) {
      setCoverArtBase64(base64);
      setPreviewCoverUrl(base64);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target?.result as string;
        setCoverArtBase64(b64);
        setPreviewCoverUrl(b64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;

    setIsSaving(true);

    const payload: UpdateTrackMetadataPayload = {
      id: track.id,
      title: title.trim() || track.file_name,
      artist: artist.trim() || 'Unknown Artist',
      album: album.trim() || 'Unknown Album',
      genre: genre.trim() || undefined,
      year: year ? parseInt(year, 10) : undefined,
      track_number: trackNumber ? parseInt(trackNumber, 10) : undefined,
      bpm: bpm ? parseFloat(bpm) : undefined,
      musical_key: musicalKey.trim() || undefined,
      camelot_key: camelotKey.trim() || undefined,
      cover_art_base64: coverArtBase64 || undefined,
      writeToSourceFile,
    };

    try {
      const updated = await window.api.updateMetadata(payload);
      if (updated) {
        updateCurrentTrackMetadata(updated);
      }
      await fetchTracks();
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
        setEditingTrack(null);
      }, 600);
    } catch (err) {
      console.error('Failed to update metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] sticky top-0 bg-[var(--bg-secondary)] z-10">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Edit Track Details & Artwork
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Top Section: Cover Art + Basic Info */}
          <div className="flex gap-6">
            {/* Artwork Uploader */}
            <div className="flex flex-col items-center gap-2">
              <div
                onClick={handlePickImage}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleImageDrop}
                className="w-36 h-36 rounded-lg bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] hover:border-emerald-500 flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden transition-all shadow-inner"
              >
                {previewCoverUrl ? (
                  <>
                    <img
                      src={previewCoverUrl}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs transition-opacity">
                      <Upload className="w-6 h-6 mb-1" />
                      <span>Change Image</span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-center p-2 text-[var(--text-muted)]">
                    <ImageIcon className="w-8 h-8 mb-1 opacity-60" />
                    <span className="text-[11px]">Upload Cover</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handlePickImage}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Choose Image...
              </button>
            </div>

            {/* Title & Artist & Album */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                  placeholder="Song Title"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Artist
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                    placeholder="Artist Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Album
                  </label>
                  <input
                    type="text"
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                    placeholder="Album Name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                    placeholder="e.g. Electronic"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                    placeholder="2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Track #
                  </label>
                  <input
                    type="number"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DJ & Harmonic Mixing Section: BPM & Camelot Wheel */}
          <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                DJ Metadata: Tempo & Musical Key
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">BPM:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bpm}
                    onChange={(e) => setBpm(e.target.value)}
                    className="w-20 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-2 py-1 text-xs text-[var(--text-primary)] font-mono outline-none"
                    placeholder="128.0"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Key:</label>
                  <input
                    type="text"
                    value={musicalKey}
                    onChange={(e) => handleManualKeyChange(e.target.value)}
                    className="w-24 bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-2 py-1 text-xs text-[var(--text-primary)] font-mono outline-none"
                    placeholder="A Minor / 8A"
                  />
                </div>
              </div>
            </div>

            {/* Visual Camelot Wheel Selector */}
            <CamelotWheelPicker
              selectedCamelot={camelotKey}
              onSelectKey={handleSelectCamelot}
            />
          </div>

          {/* Options & Save Button */}
          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={writeToSourceFile}
                onChange={(e) => setWriteToSourceFile(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span>Save tags directly to physical audio file (ID3)</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>Saved!</span>
                  </>
                ) : isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
