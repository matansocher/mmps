import type { TelegramBotConfig } from '@services/telegram';
import type { SearchRegion } from './types';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'ISRAEL_GEO',
  name: 'Israel Geo',
  token: 'ISRAEL_GEO_TELEGRAM_BOT_TOKEN',
};

export const ISRAEL_GEO_CONFIG = {
  totalRounds: 5,
  sessionTtlMs: 30 * 60 * 1000,
  maxActiveSessions: 500,
  maxSessionsPerIpPerMinute: 5,
  maxSessionsGloballyPerMinute: 100,
  maxLocationAttemptsPerRound: 12,
  panoramaSearchRadiusMeters: 1_200,
  duplicateDistanceMeters: 2_000,
  minCircleRadiusKm: 1,
  maxCircleRadiusKm: 150,
  defaultCircleRadiusKm: 25,
  circleScoreDecayKm: 75,
  missedCircleScoreMultiplier: 0.5,
  missedCircleDecayKm: 40,
  timezone: 'Asia/Jerusalem',
  cityCrownThresholds: { bronze: 30, silver: 100, gold: 250, crown: 500 },
  defaultAvatarId: 'navigator-coast',
  avatarIds: ['navigator-coast', 'navigator-desert', 'navigator-city', 'navigator-north', 'navigator-galilee', 'navigator-negev'],
} as const;

export const NAVIGATOR_TITLES = ['Street Scout', 'Route Reader', 'City Navigator', 'Israel Explorer', 'Master Cartographer', 'Local Legend'] as const;

export const SEARCH_REGIONS: readonly SearchRegion[] = [
  { name: 'Tel Aviv', center: { lat: 32.0853, lng: 34.7818 }, radiusKm: 12, weight: 16 },
  { name: 'Jerusalem', center: { lat: 31.7683, lng: 35.2137 }, radiusKm: 12, weight: 14 },
  { name: 'Haifa', center: { lat: 32.794, lng: 34.9896 }, radiusKm: 10, weight: 10 },
  { name: 'Rishon LeZion', center: { lat: 31.973, lng: 34.7925 }, radiusKm: 8, weight: 7 },
  { name: 'Petah Tikva', center: { lat: 32.084, lng: 34.8878 }, radiusKm: 8, weight: 7 },
  { name: 'Netanya', center: { lat: 32.3215, lng: 34.8532 }, radiusKm: 8, weight: 7 },
  { name: 'Ashdod', center: { lat: 31.8044, lng: 34.6553 }, radiusKm: 8, weight: 7 },
  { name: 'Beer Sheva', center: { lat: 31.252, lng: 34.7915 }, radiusKm: 10, weight: 7 },
  { name: 'Holon-Bat Yam', center: { lat: 32.0158, lng: 34.7796 }, radiusKm: 7, weight: 6 },
  { name: 'Rehovot', center: { lat: 31.8928, lng: 34.8113 }, radiusKm: 7, weight: 5 },
  { name: 'Kfar Saba-Raanana', center: { lat: 32.1848, lng: 34.8713 }, radiusKm: 8, weight: 5 },
  { name: 'Modiin', center: { lat: 31.8969, lng: 35.0104 }, radiusKm: 7, weight: 4 },
  { name: 'Ashkelon', center: { lat: 31.6688, lng: 34.5743 }, radiusKm: 8, weight: 4 },
  { name: 'Nazareth', center: { lat: 32.6996, lng: 35.3035 }, radiusKm: 8, weight: 4 },
  { name: 'Afula', center: { lat: 32.6091, lng: 35.2892 }, radiusKm: 7, weight: 3 },
  { name: 'Acre-Nahariya', center: { lat: 32.942, lng: 35.077 }, radiusKm: 12, weight: 4 },
  { name: 'Tiberias', center: { lat: 32.794, lng: 35.5312 }, radiusKm: 7, weight: 3 },
  { name: 'Eilat', center: { lat: 29.5577, lng: 34.9519 }, radiusKm: 7, weight: 3 },
];
