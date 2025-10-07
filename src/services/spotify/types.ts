export type SpotifyAuthResponse = Readonly<{
  access_token: string;
  token_type: string;
  expires_in: number;
}>;

export type SpotifyTrack = Readonly<{
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: { name: string; release_date: string };
  duration_ms: number;
  popularity: number;
  external_urls: { spotify: string };
}>;

export type SpotifyArtist = Readonly<{
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
}>;

export type SpotifyPlaylist = Readonly<{
  id: string;
  name: string;
  description: string;
  owner: { display_name: string };
  tracks: { total: number };
  external_urls: { spotify: string };
}>;

export type SpotifySearchTracksResponse = Readonly<{
  query: string;
  tracks: SpotifyTrack[];
  total: number;
}>;

export type SpotifySearchArtistsResponse = Readonly<{
  query: string;
  artists: SpotifyArtist[];
  total: number;
}>;

export type SpotifySearchPlaylistsResponse = Readonly<{
  query: string;
  playlists: SpotifyPlaylist[];
  total: number;
}>;

export type SpotifyArtistTopTracksResponse = Readonly<{
  artistId: string;
  tracks: SpotifyTrack[];
}>;
