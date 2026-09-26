export type RadarSource = 'IMSRadar' | 'radar'; // IMSRadar = "מכ״ם" (5 min), radar = "מכ״ם משולב" composite (10 min)

export type GeoPoint = {
  readonly lat: number;
  readonly lon: number;
};

export type GeoBounds = {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
};

export type RadarView = {
  readonly center: GeoPoint;
  readonly zoom: number;
  readonly width: number;
  readonly height: number;
};

// 0 = OK, 1 = no active clouds, 2 = maintenance, 3 = technical failure
export type RadarStatus = 0 | 1 | 2 | 3;

export type RadarFrame = {
  readonly time: string; // Israel local time, format: "YYYY-MM-DD HH:MM:SS"
  readonly url: string;
  readonly status: RadarStatus;
};

export type RadarFrameSelection = {
  readonly source: RadarSource;
  readonly frames: ReadonlyArray<RadarFrame>;
};

export type ImsRadarItem = {
  readonly id: string;
  readonly forecast_time: string;
  readonly modified: string;
  readonly created: string;
  readonly file_name: string;
  readonly type: string;
};

export type ImsRadarResponse = {
  readonly data: {
    readonly types: {
      readonly IMSRadar?: ReadonlyArray<ImsRadarItem>;
      readonly radar?: ReadonlyArray<ImsRadarItem>;
    };
  };
};

export type RainRadarOptions = {
  readonly view?: RadarView;
  readonly marker?: GeoPoint;
  readonly minutes?: number;
};

export type RainRadarAnimation = {
  readonly gif: Buffer;
  readonly latestFrame: Buffer; // PNG
  readonly source: RadarSource;
  readonly latestTime: string; // Israel local time, format: "YYYY-MM-DD HH:MM:SS"
  readonly latestStatus: RadarStatus;
  readonly frameCount: number;
};

export type GeneratedRadarImage = {
  readonly path: string;
  readonly time: string;
};
