export type RainRadarOptions = {
  readonly location?: string;
  readonly centerLat?: number;
  readonly centerLon?: number;
  readonly zoom?: number;
  readonly width?: number;
  readonly height?: number;
};

export type RadarImage = {
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
      readonly radar?: ReadonlyArray<RadarImage>;
      readonly IMSRadar?: ReadonlyArray<RadarImage>;
    };
  };
};

export type WorldPixel = {
  readonly x: number;
  readonly y: number;
};

export type RadarBounds = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

export type TargetBounds = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};
