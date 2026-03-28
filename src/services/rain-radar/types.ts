export type RainRadarOptions = {
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
      readonly IMSRadar4GIS?: ReadonlyArray<RadarImage>;
      readonly radarComposite?: ReadonlyArray<RadarImage>;
    };
  };
};
