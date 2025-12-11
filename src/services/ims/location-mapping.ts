export type LocationMapping = {
  readonly id: number;
  readonly nameEn: string;
  readonly nameHe?: string;
  readonly coords: {
    readonly lat: number;
    readonly lon: number;
  };
};

const LOCATION_MAP: Record<string, LocationMapping> = {
  jerusalem: { id: 1, nameEn: 'Jerusalem', coords: { lat: 31.7683, lon: 35.2137 } },
  'tel aviv': { id: 2, nameEn: 'Tel Aviv - Yafo', coords: { lat: 32.0853, lon: 34.7818 } },
  'tel aviv-yafo': { id: 2, nameEn: 'Tel Aviv - Yafo', coords: { lat: 32.0853, lon: 34.7818 } },
  'tel aviv - yafo': { id: 2, nameEn: 'Tel Aviv - Yafo', coords: { lat: 32.0853, lon: 34.7818 } },
  haifa: { id: 3, nameEn: 'Haifa', coords: { lat: 32.794, lon: 34.9896 } },
  'rishon lezion': { id: 4, nameEn: 'Rishon LeZion', coords: { lat: 31.9642, lon: 34.8046 } },
  'petah tikva': { id: 5, nameEn: 'Petah Tikva', coords: { lat: 32.0878, lon: 34.8873 } },
  ashdod: { id: 6, nameEn: 'Ashdod', coords: { lat: 31.8044, lon: 34.6553 } },
  netanya: { id: 7, nameEn: 'Netanya', coords: { lat: 32.3342, lon: 34.8598 } },
  'beer sheva': { id: 8, nameEn: 'Beer Sheva', coords: { lat: 31.2518, lon: 34.7913 } },
  "be'er sheva": { id: 8, nameEn: 'Beer Sheva', coords: { lat: 31.2518, lon: 34.7913 } },
  beersheba: { id: 8, nameEn: 'Beer Sheva', coords: { lat: 31.2518, lon: 34.7913 } },
  holon: { id: 9, nameEn: 'Holon', coords: { lat: 32.0112, lon: 34.7741 } },
  'bnei brak': { id: 10, nameEn: 'Bnei Brak', coords: { lat: 32.0811, lon: 34.8338 } },
  'ramat gan': { id: 11, nameEn: 'Ramat Gan', coords: { lat: 32.0713, lon: 34.8237 } },
  ashkelon: { id: 12, nameEn: 'Ashkelon', coords: { lat: 31.6681, lon: 34.5743 } },
  rehovot: { id: 13, nameEn: 'Rehovot', coords: { lat: 31.8944, lon: 34.8081 } },
  'bat yam': { id: 14, nameEn: 'Bat Yam', coords: { lat: 32.0219, lon: 34.7516 } },
  'kfar saba': { id: 16, nameEn: 'Kfar Saba', coords: { lat: 32.1742, lon: 34.9076 } },
  'kfar sava': { id: 16, nameEn: 'Kfar Saba', coords: { lat: 32.1742, lon: 34.9076 } },
  herzliya: { id: 17, nameEn: 'Herzliya', coords: { lat: 32.1667, lon: 34.8417 } },
  hadera: { id: 18, nameEn: 'Hadera', coords: { lat: 32.4375, lon: 34.9184 } },
  modiin: { id: 19, nameEn: "Modi'in-Maccabim-Re'ut", coords: { lat: 31.8932, lon: 35.0045 } },
  "modi'in": { id: 19, nameEn: "Modi'in-Maccabim-Re'ut", coords: { lat: 31.8932, lon: 35.0045 } },
  nazareth: { id: 20, nameEn: 'Nazareth', coords: { lat: 32.7018, lon: 35.2973 } },
  lod: { id: 21, nameEn: 'Lod', coords: { lat: 31.9514, lon: 34.8948 } },
  ramla: { id: 22, nameEn: 'Ramla', coords: { lat: 31.9296, lon: 34.8671 } },
  raanana: { id: 23, nameEn: "Ra'anana", coords: { lat: 32.1842, lon: 34.8705 } },
  "ra'anana": { id: 23, nameEn: "Ra'anana", coords: { lat: 32.1842, lon: 34.8705 } },
  givatayim: { id: 24, nameEn: 'Givatayim', coords: { lat: 32.0711, lon: 34.8116 } },
  nahariya: { id: 25, nameEn: 'Nahariya', coords: { lat: 33.0057, lon: 35.0931 } },
  'beitar illit': { id: 26, nameEn: 'Beitar Illit', coords: { lat: 31.6989, lon: 35.1217 } },
  acre: { id: 27, nameEn: 'Acre', coords: { lat: 32.9234, lon: 35.0839 } },
  akko: { id: 27, nameEn: 'Acre', coords: { lat: 32.9234, lon: 35.0839 } },
  'umm al-fahm': { id: 28, nameEn: 'Umm al-Fahm', coords: { lat: 32.5163, lon: 35.1522 } },
  'ramat hasharon': { id: 29, nameEn: 'Ramat HaSharon', coords: { lat: 32.1456, lon: 34.8395 } },
  karmiel: { id: 30, nameEn: 'Karmiel', coords: { lat: 32.9188, lon: 35.2964 } },
  eilat: { id: 31, nameEn: 'Eilat', coords: { lat: 29.5577, lon: 34.9519 } },
  tiberias: { id: 32, nameEn: 'Tiberias', coords: { lat: 32.7953, lon: 35.5302 } },
  'rosh haayin': { id: 33, nameEn: "Rosh Ha'Ayin", coords: { lat: 32.0956, lon: 34.9567 } },
  "rosh ha'ayin": { id: 33, nameEn: "Rosh Ha'Ayin", coords: { lat: 32.0956, lon: 34.9567 } },
  afula: { id: 34, nameEn: 'Afula', coords: { lat: 32.6077, lon: 35.2897 } },
  netivot: { id: 35, nameEn: 'Netivot', coords: { lat: 31.4234, lon: 34.5984 } },
  'qiryat gat': { id: 37, nameEn: 'Qiryat Gat', coords: { lat: 31.6103, lon: 34.7644 } },
};

export function getImsLocationId(cityName: string): number | null {
  const normalized = cityName.toLowerCase().trim();
  const mapping = LOCATION_MAP[normalized];
  return mapping?.id ?? null;
}

export function getLocationInfo(locationId: number): LocationMapping | null {
  return Object.values(LOCATION_MAP).find((loc) => loc.id === locationId) ?? null;
}

export function isIsraeliCity(cityName: string): boolean {
  return getImsLocationId(cityName) !== null;
}
