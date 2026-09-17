export interface PlayerTrack {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string;
  albumTitle?: string | null;
  albumSlug?: string | null;
  coverUrl: string | null;
  audioUrl: string;
  /** Distinct download-quality file when one exists; null when downloads are unavailable. */
  downloadUrl: string | null;
  duration: number;
  downloadEnabled: boolean;
  isExplicit: boolean;
  lyrics?: string | null;
}

export interface SearchTrackResult {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string;
  coverUrl: string | null;
  duration: number;
}

export interface SearchArtistResult {
  id: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
}

export interface SearchAlbumResult {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  coverUrl: string | null;
}

export interface SearchPlaylistResult {
  id: string;
  slug: string;
  title: string;
  trackCount: number;
  coverUrl: string | null;
}

export interface SearchResponse {
  tracks: SearchTrackResult[];
  artists: SearchArtistResult[];
  albums: SearchAlbumResult[];
  playlists: SearchPlaylistResult[];
}
