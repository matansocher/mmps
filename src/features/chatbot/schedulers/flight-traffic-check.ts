import { subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { type Bot, InlineKeyboard } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import {
  type CountryGeometry,
  type CountryTrafficSnapshot,
  evaluateTraffic,
  getSamplesForHour,
  getTrafficState,
  LOOKBACK_DAYS,
  MIN_BASELINE,
  MONITORED_COUNTRIES,
  type MonitoredCountry,
  NEIGHBOUR_NORMAL_RATIO,
  sampleCountryTraffic,
  saveSample,
  setTrafficState,
  type TrafficEvaluation,
} from '@shared/flight-traffic';
import { getAllCountries } from '@shared/worldly';

const logger = new Logger('chatbot:scheduler:flight-traffic-check');

const HOUR_MS = 60 * 60 * 1000;

function buildMapUrl({ mapCenter }: MonitoredCountry): string {
  return `https://adsb.lol/?lat=${mapCenter.lat}&lon=${mapCenter.lon}&zoom=${mapCenter.zoom}`;
}

function buildNeighbourLine(snapshot: CountryTrafficSnapshot, evaluation: TrafficEvaluation): string | null {
  const { baselineOutside, neighbourRatio } = evaluation;
  if (baselineOutside === null || neighbourRatio === null || baselineOutside < MIN_BASELINE) {
    return null;
  }
  const counts = `${snapshot.outsideCount} vs typical ${Math.round(baselineOutside)}`;
  return neighbourRatio >= NEIGHBOUR_NORMAL_RATIO
    ? `Neighbouring airspace looks normal (${counts}), so this is likely real and not a data gap.`
    : `Neighbouring airspace is also quiet (${counts}). This could be a wider regional closure or a gap in ADS-B coverage.`;
}

export function buildLowTrafficMessage(country: MonitoredCountry, snapshot: CountryTrafficSnapshot, evaluation: TrafficEvaluation, now: Date): string {
  const place = `${country.emoji} ${country.name}`;
  const headline = snapshot.insideCount === 0 ? `🚫✈️ No flights at all over ${place}` : `✈️🚫 Unusually low air traffic over ${place}`;
  const baseline = Math.round(evaluation.baselineInside ?? 0);
  const drop = baseline > 0 ? Math.round((1 - snapshot.insideCount / baseline) * 100) : 0;
  const lines = [headline, `🕓 ${formatInTimeZone(now, DEFAULT_TIMEZONE, 'HH:mm')} - ${snapshot.insideCount} airborne aircraft (typical for this hour: ${baseline}, -${drop}%)`];

  const neighbourLine = buildNeighbourLine(snapshot, evaluation);
  if (neighbourLine) {
    lines.push(neighbourLine);
  }
  if (snapshot.callsigns.length) {
    lines.push(`Still flying: ${snapshot.callsigns.join(', ')}`);
  }
  return lines.join('\n');
}

export function buildRecoveryMessage(country: MonitoredCountry, snapshot: CountryTrafficSnapshot, evaluation: TrafficEvaluation, lowSince: Date | null, now: Date): string {
  const lines = [
    `✅ Air traffic over ${country.emoji} ${country.name} is back to normal`,
    `🕓 ${formatInTimeZone(now, DEFAULT_TIMEZONE, 'HH:mm')} - ${snapshot.insideCount} airborne aircraft (typical for this hour: ${Math.round(evaluation.baselineInside ?? 0)})`,
  ];
  if (lowSince) {
    const hours = Math.round((now.getTime() - new Date(lowSince).getTime()) / HOUR_MS);
    lines.push(hours >= 1 ? `The low traffic lasted about ${hours}h.` : 'The low traffic lasted less than an hour.');
  }
  return lines.join('\n');
}

async function checkCountry(bot: Bot, country: MonitoredCountry, geometry: CountryGeometry, now: Date): Promise<void> {
  const snapshot = await sampleCountryTraffic(country, geometry);
  const utcHour = now.getUTCHours();

  const [history, state] = await Promise.all([getSamplesForHour(country.alpha2, utcHour, subDays(now, LOOKBACK_DAYS), now), getTrafficState(country.alpha2)]);
  await saveSample({ countryAlpha2: country.alpha2, utcHour, insideCount: snapshot.insideCount, outsideCount: snapshot.outsideCount, sampledAt: now });

  const evaluation = evaluateTraffic({ inside: snapshot.insideCount, outside: snapshot.outsideCount, history, isLowTraffic: state?.isLowTraffic ?? false });
  logger.log(`${country.name}: ${snapshot.insideCount} inside, ${snapshot.outsideCount} outside, baseline ${evaluation.baselineInside ?? '-'} (${evaluation.status})`);

  const reply_markup = new InlineKeyboard().url('🗺 Live map', buildMapUrl(country));

  if (evaluation.transition === 'enter_low') {
    await bot.api.sendMessage(MY_USER_ID, buildLowTrafficMessage(country, snapshot, evaluation, now), { reply_markup });
    await setTrafficState(country.alpha2, true, now);
  } else if (evaluation.transition === 'recover') {
    await bot.api.sendMessage(MY_USER_ID, buildRecoveryMessage(country, snapshot, evaluation, state?.lowSince ?? null, now), { reply_markup });
    await setTrafficState(country.alpha2, false, null);
  }
}

// Hourly: counts airborne aircraft over each monitored country and DMs once when traffic
// drops far below the usual level for this hour, and again when it recovers.
export async function flightTrafficCheck(bot: Bot, now: Date = new Date()): Promise<void> {
  const countries = await getAllCountries();

  for (const country of MONITORED_COUNTRIES) {
    const geometry = countries.find(({ alpha2 }) => alpha2 === country.alpha2)?.geometry;
    if (!geometry) {
      logger.error(`No border geometry found for ${country.name} in the Worldly countries collection`);
      continue;
    }

    try {
      await checkCountry(bot, country, geometry, now);
    } catch (err) {
      logger.error(`Failed to check flight traffic over ${country.name}: ${getErrorMessage(err)}`);
    }
  }
}
