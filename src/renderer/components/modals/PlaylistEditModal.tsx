import React, { useState } from 'react';
import { X, Upload, ListPlus, Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { Playlist } from '../../../shared/types.js';
import { useLibraryStore } from '../../store/libraryStore.js';

interface PlaylistEditModalProps {
  playlist: Playlist;
  onClose: () => void;
}

export const PlaylistEditModal: React.FC<PlaylistEditModalProps> = ({ playlist, onClose }) => {
  const { updatePlaylist, deletePlaylist } = useLibraryStore();

  const [name, setName] = useState(playlist.name || '');
  const [description, setDescription] = useState(playlist.description || '');
  const [coverBase64, setCoverBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    playlist.cover_art_path && window.api ? window.api.getCoverUrl(playlist.cover_art_path) : null
  );
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    if (!window.api) return;
    const base64 = await window.api.pickImage();
    if (base64) {
      setCoverBase64(base64);
      setPreviewUrl(base64);
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
        setCoverBase64(b64);
        setPreviewUrl(b64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await updatePlaylist(playlist.id, name.trim(), description.trim(), coverBase64 || undefined);
      onClose();
    } catch (err) {
      console.error('Error saving playlist:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      await deletePlaylist(playlist.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Edit Playlist Details
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
          <div className="flex gap-5">
            {/* Cover art uploader */}
            <div
              onClick={handlePickImage}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={handleImageDrop}
              className="w-32 h-32 rounded-lg bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] hover:border-emerald-500 flex flex-col items-center justify-center relative group cursor-pointer overflow-hidden transition-all shadow-inner flex-shrink-0"
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs transition-opacity">
                    <Upload className="w-5 h-5 mb-1" />
                    <span>Change</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center p-2 text-[var(--text-muted)]">
                  <ImageIcon className="w-7 h-7 mb-1 opacity-60" />
                  <span className="text-[10px]">Upload Artwork</span>
                </div>
              )}
            </div>

            {/* Name & Description */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] outline-none"
                  placeholder="My Playlist"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-emerald-500 rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none resize-none"
                  placeholder="Give your playlist a description..."
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
            {!playlist.is_system ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Playlist</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Playlist'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
