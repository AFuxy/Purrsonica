import { create } from 'zustand';
import { Track, DriveInfo, Album, Playlist, LibraryStats } from '../../shared/types.js';
import { usePlayerStore } from './playerStore.js';

export type LibraryViewType =
  | 'all'
  | 'liked'
  | 'drive'
  | 'albums'
  | 'album_detail'
  | 'artist_detail'
  | 'track_detail'
  | 'playlists'
  | 'playlist_detail'
  | 'videos'
  | 'search'
  | 'settings';

export interface NavigationEntry {
  view: LibraryViewType;
  selectedDrive: string | null;
  selectedAlbum: Album | null;
  selectedPlaylist: Playlist | null;
  selectedArtist: string | null;
  selectedTrackDetail: Track | null;
}

interface LibraryState {
  currentView: LibraryViewType;
  selectedDrive: string | null;
  selectedAlbum: Album | null;
  selectedPlaylist: Playlist | null;
  selectedArtist: string | null;
  selectedTrackDetail: Track | null;

  // Navigation History
  navHistory: NavigationEntry[];
  navIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;

  tracks: Track[];
  totalTracks: number;
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;

  searchQuery: string;
  sortBy: 'title' | 'artist' | 'album' | 'duration' | 'bpm' | 'camelot_key' | 'created_at' | 'track_number';
  sortOrder: 'ASC' | 'DESC';

  drives: DriveInfo[];
  albums: Album[];
  playlists: Playlist[];
  stats: LibraryStats | null;

  // Metadata editor modal target
  editingTrack: Track | null;

  // Navigation Actions
  setView: (view: LibraryViewType) => void;
  selectDrive: (driveLetter: string) => void;
  selectAlbum: (album: Album) => void;
  selectAlbumByName: (albumName: string, artistName?: string) => void;
  selectArtist: (artistName: string) => void;
  selectTrackDetail: (track: Track) => void;
  selectPlaylist: (playlist: Playlist) => void;
  goBack: () => void;
  goForward: () => void;
  pushNav: (entry: NavigationEntry) => void;

  setSearchQuery: (query: string) => void;
  setSorting: (sortBy: any, sortOrder?: 'ASC' | 'DESC') => void;
  setEditingTrack: (track: Track | null) => void;

  // Data fetchers
  fetchTracks: () => Promise<void>;
  fetchMoreTracks: () => Promise<void>;
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
  selectedArtist: null,
  selectedTrackDetail: null,

  navHistory: [{ view: 'all', selectedDrive: null, selectedAlbum: null, selectedPlaylist: null, selectedArtist: null, selectedTrackDetail: null }],
  navIndex: 0,
  canGoBack: false,
  canGoForward: false,

  tracks: [],
  totalTracks: 0,
  isLoading: false,
  hasMore: true,
  isLoadingMore: false,

  searchQuery: '',
  sortBy: 'title',
  sortOrder: 'ASC',

  drives: [],
  albums: [],
  playlists: [],
  stats: null,
  editingTrack: null,

  pushNav: (entry: NavigationEntry) => {
    const { navHistory, navIndex } = get();
    const current = navHistory[navIndex];

    if (
      current &&
      current.view === entry.view &&
      current.selectedDrive === entry.selectedDrive &&
      current.selectedAlbum?.id === entry.selectedAlbum?.id &&
      current.selectedPlaylist?.id === entry.selectedPlaylist?.id &&
      current.selectedArtist === entry.selectedArtist &&
      current.selectedTrackDetail?.id === entry.selectedTrackDetail?.id
    ) {
      return;
    }

    const nextHistory = [...navHistory.slice(0, navIndex + 1), entry];
    const nextIndex = nextHistory.length - 1;

    set({
      navHistory: nextHistory,
      navIndex: nextIndex,
      canGoBack: nextIndex > 0,
      canGoForward: false,
    });
  },

  goBack: () => {
    const { navHistory, navIndex } = get();
    if (navIndex <= 0) return;

    const prevIndex = navIndex - 1;
    const prev = navHistory[prevIndex];

    set({
      navIndex: prevIndex,
      canGoBack: prevIndex > 0,
      canGoForward: true,
      currentView: prev.view,
      selectedDrive: prev.selectedDrive,
      selectedAlbum: prev.selectedAlbum,
      selectedPlaylist: prev.selectedPlaylist,
      selectedArtist: prev.selectedArtist,
      selectedTrackDetail: prev.selectedTrackDetail,
    });

    if (prev.view === 'albums') {
      get().fetchAlbums();
    } else if (prev.view === 'playlists') {
      get().fetchPlaylists();
    } else if (prev.view === 'settings' || prev.view === 'track_detail') {
      // no track list query needed
    } else {
      get().fetchTracks();
    }
  },

  goForward: () => {
    const { navHistory, navIndex } = get();
    if (navIndex >= navHistory.length - 1) return;

    const nextIndex = navIndex + 1;
    const next = navHistory[nextIndex];

    set({
      navIndex: nextIndex,
      canGoBack: true,
      canGoForward: nextIndex < navHistory.length - 1,
      currentView: next.view,
      selectedDrive: next.selectedDrive,
      selectedAlbum: next.selectedAlbum,
      selectedPlaylist: next.selectedPlaylist,
      selectedArtist: next.selectedArtist,
      selectedTrackDetail: next.selectedTrackDetail,
    });

    if (next.view === 'albums') {
      get().fetchAlbums();
    } else if (next.view === 'playlists') {
      get().fetchPlaylists();
    } else if (next.view === 'settings' || next.view === 'track_detail') {
      // no track list query needed
    } else {
      get().fetchTracks();
    }
  },

  setView: (view: LibraryViewType) => {
    const selectedDrive = view === 'drive' ? get().selectedDrive : null;
    const selectedAlbum = view === 'album_detail' ? get().selectedAlbum : null;
    const selectedPlaylist = view === 'playlist_detail' ? get().selectedPlaylist : null;
    const selectedArtist = view === 'artist_detail' ? get().selectedArtist : null;
    const selectedTrackDetail = view === 'track_detail' ? get().selectedTrackDetail : null;
    const searchQuery = view === 'search' ? get().searchQuery : '';

    set({
      currentView: view,
      searchQuery,
      selectedDrive,
      selectedAlbum,
      selectedPlaylist,
      selectedArtist,
      selectedTrackDetail,
    });

    get().pushNav({ view, selectedDrive, selectedAlbum, selectedPlaylist, selectedArtist, selectedTrackDetail });

    if (view === 'albums') {
      get().fetchAlbums();
    } else if (view === 'playlists') {
      get().fetchPlaylists();
    } else if (view === 'settings' || view === 'track_detail') {
      // no track list query needed
    } else {
      get().fetchTracks();
    }
  },

  selectDrive: (driveLetter: string) => {
    set({
      currentView: 'drive',
      selectedDrive: driveLetter,
    });

    get().pushNav({ view: 'drive', selectedDrive: driveLetter, selectedAlbum: null, selectedPlaylist: null, selectedArtist: null, selectedTrackDetail: null });
    get().fetchTracks();
  },

  selectAlbum: (album: Album) => {
    set({
      currentView: 'album_detail',
      selectedAlbum: album,
    });

    get().pushNav({ view: 'album_detail', selectedDrive: null, selectedAlbum: album, selectedPlaylist: null, selectedArtist: null, selectedTrackDetail: null });
    get().fetchTracks();
  },

  selectAlbumByName: (albumName: string, artistName?: string) => {
    const cleanName = albumName ? albumName.trim() : '';
    if (!cleanName || cleanName.toLowerCase() === 'unknown album') return;

    let found = get().albums.find(
      (a) => a.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (!found) {
      found = {
        id: `virtual-${cleanName}`,
        name: cleanName,
        artist: artistName || 'Various Artists',
        track_count: 0,
        is_custom: false,
      };
    }

    set({
      currentView: 'album_detail',
      selectedAlbum: found,
    });

    get().pushNav({ view: 'album_detail', selectedDrive: null, selectedAlbum: found, selectedPlaylist: null, selectedArtist: null, selectedTrackDetail: null });
    get().fetchTracks();
  },

  selectArtist: (artistName: string) => {
    const cleanArtist = artistName ? artistName.trim() : '';
    if (!cleanArtist || cleanArtist.toLowerCase() === 'unknown artist') return;

    set({
      currentView: 'artist_detail',
      selectedArtist: cleanArtist,
    });

    get().pushNav({ view: 'artist_detail', selectedDrive: null, selectedAlbum: null, selectedPlaylist: null, selectedArtist: cleanArtist, selectedTrackDetail: null });
    get().fetchTracks();
  },

  selectTrackDetail: (track: Track) => {
    set({
      currentView: 'track_detail',
      selectedTrackDetail: track,
    });

    get().pushNav({ view: 'track_detail', selectedDrive: null, selectedAlbum: null, selectedPlaylist: null, selectedArtist: null, selectedTrackDetail: track });
  },

  selectPlaylist: (playlist: Playlist) => {
    set({
      currentView: 'playlist_detail',
      selectedPlaylist: playlist,
    });

    get().pushNav({ view: 'playlist_detail', selectedDrive: null, selectedAlbum: null, selectedPlaylist: playlist, selectedArtist: null, selectedTrackDetail: null });
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
      const { currentView, selectedDrive, selectedAlbum, selectedPlaylist, selectedArtist, searchQuery, sortBy, sortOrder } = get();

      const params: any = {
        sortBy,
        sortOrder,
        limit: 250,
        offset: 0,
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
      } else if (currentView === 'artist_detail' && selectedArtist) {
        params.artist = selectedArtist;
      } else if (currentView === 'playlist_detail' && selectedPlaylist) {
        params.playlistId = selectedPlaylist.id;
      } else if (currentView === 'videos') {
        params.mediaType = 'video';
      }

      const result = await window.api.queryTracks(params);
      set({
        tracks: result.tracks,
        totalTracks: result.total,
        hasMore: result.tracks.length < result.total,
        isLoading: false,
      });
    } catch (err) {
      console.error('Error fetching tracks:', err);
      set({ isLoading: false });
    }
  },

  fetchMoreTracks: async () => {
    if (!window.api || get().isLoadingMore || !get().hasMore) return;
    set({ isLoadingMore: true });

    try {
      const { currentView, selectedDrive, selectedAlbum, selectedPlaylist, selectedArtist, searchQuery, sortBy, sortOrder, tracks, totalTracks } = get();

      const params: any = {
        sortBy,
        sortOrder,
        limit: 250,
        offset: tracks.length,
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
      } else if (currentView === 'artist_detail' && selectedArtist) {
        params.artist = selectedArtist;
      } else if (currentView === 'playlist_detail' && selectedPlaylist) {
        params.playlistId = selectedPlaylist.id;
      } else if (currentView === 'videos') {
        params.mediaType = 'video';
      }

      const result = await window.api.queryTracks(params);
      const combined = [...tracks, ...result.tracks];
      set({
        tracks: combined,
        hasMore: combined.length < totalTracks,
        isLoadingMore: false,
      });
    } catch (err) {
      console.error('Error fetching more tracks:', err);
      set({ isLoadingMore: false });
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

    // Determine current like state
    const currentLiked =
      get().tracks.find((t) => t.id === trackId)?.is_liked ??
      (usePlayerStore.getState().currentTrack?.id === trackId
        ? usePlayerStore.getState().currentTrack?.is_liked
        : false);
    const optimisticState = !currentLiked;

    // Optimistic UI update across LibraryStore
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === trackId ? { ...t, is_liked: optimisticState } : t
      ),
      selectedTrackDetail:
        state.selectedTrackDetail?.id === trackId
          ? { ...state.selectedTrackDetail, is_liked: optimisticState }
          : state.selectedTrackDetail,
    }));

    // Optimistic UI update across PlayerStore (currentTrack, queue, history)
    usePlayerStore.getState().updateTrackLikeState(trackId, optimisticState);

    try {
      const newLikedState = await window.api.toggleLike(trackId);
      // Sync exact confirmed state across both stores
      set((state) => ({
        tracks: state.tracks.map((t) =>
          t.id === trackId ? { ...t, is_liked: newLikedState } : t
        ),
        selectedTrackDetail:
          state.selectedTrackDetail?.id === trackId
            ? { ...state.selectedTrackDetail, is_liked: newLikedState }
            : state.selectedTrackDetail,
      }));
      usePlayerStore.getState().updateTrackLikeState(trackId, newLikedState);
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
