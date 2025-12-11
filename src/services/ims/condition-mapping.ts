export type WeatherConditionMapping = {
  readonly imsCode: number;
  readonly condition: string;
  readonly ourCode: number;
  readonly isRain: boolean;
};

const CONDITION_MAP: WeatherConditionMapping[] = [
  // Clear/Sunny
  { imsCode: 1010, condition: 'Clear', ourCode: 1000, isRain: false },
  { imsCode: 1020, condition: 'Partly Cloudy', ourCode: 1003, isRain: false },

  // Cloudy
  { imsCode: 1220, condition: 'Cloudy', ourCode: 1006, isRain: false },
  { imsCode: 1250, condition: 'Partly Cloudy', ourCode: 1003, isRain: false },
  { imsCode: 1260, condition: 'Overcast', ourCode: 1009, isRain: false },

  // Rain
  { imsCode: 1140, condition: 'Rain', ourCode: 1180, isRain: true },
  { imsCode: 1150, condition: 'Light Rain', ourCode: 1183, isRain: true },
  { imsCode: 1160, condition: 'Moderate Rain', ourCode: 1189, isRain: true },
  { imsCode: 1170, condition: 'Heavy Rain', ourCode: 1195, isRain: true },
  { imsCode: 1180, condition: 'Heavy Rain', ourCode: 1195, isRain: true },
  { imsCode: 1190, condition: 'Light Rain Shower', ourCode: 1240, isRain: true },

  // Drizzle/Light Rain
  { imsCode: 1510, condition: 'Drizzle', ourCode: 1150, isRain: true },
  { imsCode: 1520, condition: 'Light Drizzle', ourCode: 1150, isRain: true },
  { imsCode: 1530, condition: 'Drizzle', ourCode: 1153, isRain: true },
  { imsCode: 1540, condition: 'Light Rain', ourCode: 1183, isRain: true },
  { imsCode: 1550, condition: 'Light Rain', ourCode: 1183, isRain: true },
  { imsCode: 1560, condition: 'Light Rain Shower', ourCode: 1240, isRain: true },

  // Thunderstorm
  { imsCode: 1610, condition: 'Thunderstorm', ourCode: 1273, isRain: true },
  { imsCode: 1620, condition: 'Thunderstorm with Rain', ourCode: 1276, isRain: true },

  // Fog/Mist
  { imsCode: 1310, condition: 'Fog', ourCode: 1135, isRain: false },
  { imsCode: 1320, condition: 'Mist', ourCode: 1030, isRain: false },
];

export function mapImsCondition(imsCode: number | string): {
  condition: string;
  code: number;
  isRain: boolean;
} {
  const codeNum = typeof imsCode === 'string' ? parseInt(imsCode, 10) : imsCode;
  const mapping = CONDITION_MAP.find((m) => m.imsCode === codeNum);

  return mapping
    ? {
        condition: mapping.condition,
        code: mapping.ourCode,
        isRain: mapping.isRain,
      }
    : {
        condition: 'Unknown',
        code: 0,
        isRain: false,
      };
}
