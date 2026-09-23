export type ItunesTrack = {
  readonly wrapperType: string;
  readonly trackName?: string;
  readonly artistName?: string;
  readonly collectionName?: string;
};

export type ItunesLookupResponse = {
  readonly resultCount: number;
  readonly results: ItunesTrack[];
};

export type AppleMusicLink = {
  readonly trackId: string;
  readonly country: string;
};

export type AppleMusicSong = {
  readonly name: string;
  readonly artist: string;
  readonly album: string;
};
