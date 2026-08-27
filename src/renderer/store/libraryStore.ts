import { create } from 'zustand';
import { Track, DriveInfo, Album, Playlist, LibraryStats } from '../../shared/types.js';

export type LibraryViewType =
  | 'all'
  | 'liked'
  | 'drive'
  | 'albums'
  | 'album_detail'
  | 'playlists'
  | 'playlist_detail'
  | 'videos'
  | 'search'
  | 'settings';

interface LibraryState {
  currentView: LibraryViewType;
  selectedDrive: string | null;
  selectedAlbum: Album | null;
  selectedPlaylist: Playlist | null;

  tracks: Track[];
  totalTracks: number;
  isLoading: boolean;

  searchQuery: string;
  sortBy: 'title' | 'artist' | 'album' | 'duration' | 'bpm' | 'camelot_key' | 'created_at' | 'track_number';
  sortOrder: 'ASC' | 'DESC';

  drives: DriveInfo[];
  albums: Album[];
  playlists: Playlist[];
  stats: LibraryStats | null;

  // Metadata editor modal target
  editingTrack: Track | null;

  // Actions
  setView: (view: LibraryViewType) => void;
  selectDrive: (driveLetter: string) => void;
  selectAlbum: (album: Album) => void;
  selectPlaylist: (playlist: Playlist) => void;
  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: any, sortOrder?: 'ASC' | 'DESC') => void;
  setEditingTrack: (track: Track | null) => void;

  // Data fetchers
  fetchTracks: () => Promise<void>;
  fetchDrives: () => Promise<void>;
  fetchAlbums: () => Promise<void>;
  fetchPlaylists: () => Promise<void>;
  fetchStats: () => Promise<void>;
  refreshAll: () => Promise<void>;

  toggleLikeTrack: (trackId: string) => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<void>;
  updatePlaylist: (
    playlistId: string,
    name?: string,
    description?: string,
    coverArtBase64?: string
  ) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  currentView: 'all',
  selectedDrive: null,
  selectedAlbum: null,
  selectedPlaylist: null,

  tracks: [],
  totalTracks: 0,
  isLoading: false,

  searchQuery: '',
  sortBy: 'title',
  sortOrder: 'ASC',

  drives: [],
  albums: [],
  playlists: [],
  stats: null,
  editingTrack: null,

  setView: (view: LibraryViewType) => {
    set({
      currentView: view,
      selectedDrive: view === 'drive' ? get().selectedDrive : null,
      selectedAlbum: view === 'album_detail' ? get().selectedAlbum : null,
      selectedPlaylist: view === 'playlist_detail' ? get().selectedPlaylist : null,
    });
    get().fetchTracks();
  },

  selectDrive: (driveLetter: string) => {
    set({
      currentView: 'drive',
      selectedDrive: driveLetter,
    });
    get().fetchTracks();
  },

  selectAlbum: (album: Album) => {
    set({
      currentView: 'album_detail',
      selectedAlbum: album,
    });
    get().fetchTracks();
  },

  selectPlaylist: (playlist: Playlist) => {
    set({
      currentView: 'playlist_detail',
      selectedPlaylist: playlist,
    });
    get().fetchTracks();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    if (query.trim() && get().currentView !== 'search') {
      set({ currentView: 'search' });
    }
    get().fetchTracks();
  },

  setSorting: (sortBy: any, sortOrder?: 'ASC' | 'DESC') => {
    const currentSort = get().sortBy;
    const currentOrder = get().sortOrder;

    let newOrder = sortOrder;
    if (!newOrder) {
      newOrder = currentSort === sortBy && currentOrder === 'ASC' ? 'DESC' : 'ASC';
    }

    set({ sortBy, sortOrder: newOrder });
    get().fetchTracks();
  },

  setEditingTrack: (track: Track | null) => set({ editingTrack: track }),

  fetchTracks: async () => {
    if (!window.api) return;
    set({ isLoading: true });

    try {
      const { currentView, selectedDrive, selectedAlbum, selectedPlaylist, searchQuery, sortBy, sortOrder } = get();

      const params: any = {
        sortBy,
        sortOrder,
        limit: 1000,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      if (currentView === 'liked') {
        params.isLiked = true;
      } else if (currentView === 'drive' && selectedDrive) {
        params.drive = selectedDrive;
      } else if (currentView === 'album_detail' && selectedAlbum) {
        params.album = selectedAlbum.name;
        params.artist = selectedAlbum.artist;
      } else if (currentView === 'playlist_detail' && selectedPlaylist) {
        params.playlistId = selectedPlaylist.id;
      } else if (currentView === 'videos') {
        params.mediaType = 'video';
      }

      const result = await window.api.queryTracks(params);
      set({
        tracks: result.tracks,
        totalTracks: result.total,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error fetching tracks:', err);
      set({ isLoading: false });
    }
  },

  fetchDrives: async () => {
    if (!window.api) return;
    try {
      const drives = await window.api.getDrives();
      set({ drives });
    } catch (err) {
      console.error('Error fetching drives:', err);
    }
  },

  fetchAlbums: async () => {
    if (!window.api) return;
    try {
      const albums = await window.api.getAlbums();
      set({ albums });
    } catch (err) {
      console.error('Error fetching albums:', err);
    }
  },

  fetchPlaylists: async () => {
    if (!window.api) return;
    try {
      const playlists = await window.api.getPlaylists();
      set({ playlists });
    } catch (err) {
      console.error('Error fetching playlists:', err);
    }
  },

  fetchStats: async () => {
    if (!window.api) return;
    try {
      const stats = await window.api.getStats();
      set({ stats });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchTracks(),
      get().fetchDrives(),
      get().fetchAlbums(),
      get().fetchPlaylists(),
      get().fetchStats(),
    ]);
  },

  toggleLikeTrack: async (trackId: string) => {
    if (!window.api) return;

    // Optimistic UI update
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, is_liked: !t.is_liked } : t
      ),
    }));

    try {
      const newLikedState = await window.api.toggleLike(trackId);
      // Sync exact state
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, is_liked: newLikedState } : t
        ),
      }));
      get().fetchStats();
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert if error
      get().fetchTracks();
    }
  },

  createPlaylist: async (name: string, description?: string) => {
    if (!window.api) return;
    try {
      await window.api.createPlaylist(name, description);
      await get().fetchPlaylists();
    } catch (err) {
      console.error('Error creating playlist:', err);
    }
  },

  updatePlaylist: async (
    playlistId: string,
    name?: string,
    description?: string,
    coverArtBase64?: string
  ) => {
    if (!window.api) return;
    try {
      const updated = await window.api.updatePlaylist(playlistId, name, description, coverArtBase64);
      if (updated && get().selectedPlaylist?.id === playlistId) {
        set({ selectedPlaylist: { ...get().selectedPlaylist!, ...updated } });
      }
      await get().fetchPlaylists();
    } catch (err) {
      console.error('Error updating playlist:', err);
    }
  },

  deletePlaylist: async (playlistId: string) => {
    if (!window.api) return;
    try {
      await window.api.deletePlaylist(playlistId);
      if (get().selectedPlaylist?.id === playlistId) {
        get().setView('playlists');
      }
      await get().fetchPlaylists();
    } catch (err) {
      console.error('Error deleting playlist:', err);
    }
  },

  addTrackToPlaylist: async (playlistId: string, trackId: string) => {
    if (!window.api) return;
    try {
      await window.api.addTrackToPlaylist(playlistId, trackId);
      await get().fetchPlaylists();
    } catch (err) {
      console.error('Error adding track to playlist:', err);
    }
  },

  removeTrackFromPlaylist: async (playlistId: string, trackId: string) => {
    if (!window.api) return;
    try {
      await window.api.removeTrackFromPlaylist(playlistId, trackId);
      if (get().currentView === 'playlist_detail') {
        get().fetchTracks();
      }
      await get().fetchPlaylists();
    } catch (err) {
      console.error('Error removing track from playlist:', err);
    }
  },
}));
