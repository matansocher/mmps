import { buildRailSearchUrl } from '@services/israel-rail';
import type { RailStation, TrainTravel } from '@services/israel-rail';
import { findLightRailDepartures } from '@services/light-rail';
import type { LightRailStation } from '@services/light-rail';
import type {
  PlanRailTripDeps,
  PlanRailTripParams,
  PlanRailTripResult,
  RailTripDirection,
  RailTripInterchange,
  RailTripLeg,
  RailTripPlan,
  RailTripStationRef,
  RailTripTrainLeg,
  RailTripWalkLeg,
} from './types';

// Extra minutes on top of the walk to get down to / up from the platforms when catching the next leg.
export const TRANSFER_BUFFER_MINUTES = 3;
const DEFAULT_PLANS_LIMIT = 3;
const LIGHT_RAIL_OPTIONS = 3;
const TRAIN_OPTIONS = 5;
const DAY_MINUTES = 24 * 60;

type TimedLeg = { readonly leg: RailTripLeg; readonly start: number; readonly end: number };
type SearchState = { messages: Set<string>; failed: boolean };

// Absolute minutes since epoch for a local (Israel) date + time, used only for ordering and arithmetic.
function toStamp(date: string, time: string): number {
  return Date.parse(`${date}T${time}:00Z`) / 60000;
}

function fromStamp(stamp: number): { readonly date: string; readonly time: string } {
  const iso = new Date(stamp * 60000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function toRef({ nameEn, nameHe }: RailTripStationRef): RailTripStationRef {
  return { nameEn, nameHe };
}

function findLightRailLegs(deps: PlanRailTripDeps, from: LightRailStation, to: LightRailStation, stamp: number, limit: number): TimedLeg[] {
  const { date, time } = fromStamp(stamp);
  return findLightRailDepartures(deps.timetable, { fromStationId: from.id, toStationId: to.id, date, time, limit }).map((departure) => {
    const start = toStamp(departure.date, departure.departureTime);
    return {
      start,
      end: start + departure.durationMinutes,
      leg: {
        mode: 'light_rail',
        from: toRef(from),
        to: toRef(to),
        date: departure.date,
        departureTime: departure.departureTime,
        arrivalTime: departure.arrivalTime,
        durationMinutes: departure.durationMinutes,
        stopsCount: departure.stopsCount,
        towards: toRef(departure.terminus),
      },
    };
  });
}

function toTrainLeg(travel: TrainTravel, from: RailStation, to: RailStation): TimedLeg {
  const start = toStamp(travel.date, travel.departureTime);
  const arrival = toStamp(travel.date, travel.arrivalTime);
  const leg: RailTripTrainLeg = {
    mode: 'train',
    from: toRef(from),
    to: toRef(to),
    date: travel.date,
    departureTime: travel.departureTime,
    arrivalTime: travel.arrivalTime,
    durationMinutes: travel.durationMinutes,
    transfers: travel.transfers,
    transferDetails: travel.transferDetails,
    trainNumbers: travel.legs.map(({ trainNumber }) => trainNumber),
    originPlatform: travel.legs[0]?.originPlatform,
    verifyUrl: buildRailSearchUrl({ fromStationId: from.id, toStationId: to.id, date: travel.date, time: travel.departureTime }),
  };
  return { start, end: arrival < start ? arrival + DAY_MINUTES : arrival, leg };
}

async function findTrainLegs(deps: PlanRailTripDeps, from: RailStation, to: RailStation, stamp: number, limit: number, state: SearchState): Promise<TimedLeg[]> {
  const { date, time } = fromStamp(stamp);
  try {
    const { travels, messages } = await deps.searchTrains({ fromStationId: from.id, toStationId: to.id, date, hour: time, limit });
    messages.forEach((message) => state.messages.add(message));
    return travels.map((travel) => toTrainLeg(travel, from, to));
  } catch {
    state.failed = true;
    return [];
  }
}

function buildWalkLeg(interchange: RailTripInterchange, direction: RailTripDirection, start: number): TimedLeg {
  const lightRail = toRef(interchange.lightRailStation);
  const rail = toRef(interchange.railStation);
  const leg: RailTripWalkLeg = {
    mode: 'walk',
    from: direction === 'light_rail_then_train' ? lightRail : rail,
    to: direction === 'light_rail_then_train' ? rail : lightRail,
    startTime: fromStamp(start).time,
    walkingMinutes: interchange.walkingMinutes,
    walkingMeters: interchange.walkingMeters,
    transferBufferMinutes: TRANSFER_BUFFER_MINUTES,
  };
  return { start, end: start + interchange.walkingMinutes, leg };
}

type TimedPlan = { readonly start: number; readonly end: number; readonly plan: RailTripPlan };

function buildPlan(direction: RailTripDirection, interchange: RailTripInterchange, legs: readonly TimedLeg[]): TimedPlan {
  const start = legs[0].start;
  const end = legs[legs.length - 1].end;
  const departure = fromStamp(start);
  const arrival = fromStamp(end);
  const plan: RailTripPlan = {
    direction,
    date: departure.date,
    departureTime: departure.time,
    arrivalDate: arrival.date,
    arrivalTime: arrival.time,
    durationMinutes: end - start,
    interchange: { lightRail: toRef(interchange.lightRailStation), rail: toRef(interchange.railStation) },
    legs: legs.map(({ leg }) => leg),
  };
  return { start, end, plan };
}

function earliestArrival(legs: readonly TimedLeg[], readyAt: number): TimedLeg | undefined {
  return legs.filter(({ start }) => start >= readyAt).sort((a, b) => a.end - b.end)[0];
}

async function planLightRailThenTrain(
  deps: PlanRailTripDeps,
  origin: LightRailStation,
  destination: RailStation,
  interchange: RailTripInterchange,
  requested: number,
  state: SearchState,
): Promise<TimedPlan[]> {
  const direction: RailTripDirection = 'light_rail_then_train';
  const { lightRailStation, railStation, walkingMinutes } = interchange;
  const startsAtInterchange = origin.id === lightRailStation.id;
  const endsAtInterchange = destination.id === railStation.id;
  if (startsAtInterchange && endsAtInterchange) return [];

  if (endsAtInterchange) {
    return findLightRailLegs(deps, origin, lightRailStation, requested, LIGHT_RAIL_OPTIONS).map((lightRail) =>
      buildPlan(direction, interchange, [lightRail, buildWalkLeg(interchange, direction, lightRail.end)]),
    );
  }

  if (startsAtInterchange) {
    const trains = await findTrainLegs(deps, railStation, destination, requested + walkingMinutes + TRANSFER_BUFFER_MINUTES, LIGHT_RAIL_OPTIONS, state);
    return trains.map((train) => buildPlan(direction, interchange, [buildWalkLeg(interchange, direction, train.start - TRANSFER_BUFFER_MINUTES - walkingMinutes), train]));
  }

  const lightRails = findLightRailLegs(deps, origin, lightRailStation, requested, LIGHT_RAIL_OPTIONS);
  if (!lightRails.length) return [];
  const trains = await findTrainLegs(deps, railStation, destination, lightRails[0].end + walkingMinutes + TRANSFER_BUFFER_MINUTES, TRAIN_OPTIONS, state);
  return lightRails
    .map((lightRail) => {
      const train = earliestArrival(trains, lightRail.end + walkingMinutes + TRANSFER_BUFFER_MINUTES);
      return train ? buildPlan(direction, interchange, [lightRail, buildWalkLeg(interchange, direction, lightRail.end), train]) : undefined;
    })
    .filter(Boolean);
}

async function planTrainThenLightRail(
  deps: PlanRailTripDeps,
  origin: RailStation,
  destination: LightRailStation,
  interchange: RailTripInterchange,
  requested: number,
  state: SearchState,
): Promise<TimedPlan[]> {
  const direction: RailTripDirection = 'train_then_light_rail';
  const { lightRailStation, railStation, walkingMinutes } = interchange;
  const startsAtInterchange = origin.id === railStation.id;
  const endsAtInterchange = destination.id === lightRailStation.id;
  if (startsAtInterchange && endsAtInterchange) return [];

  if (startsAtInterchange) {
    const lightRails = findLightRailLegs(deps, lightRailStation, destination, requested + walkingMinutes + TRANSFER_BUFFER_MINUTES, LIGHT_RAIL_OPTIONS);
    return lightRails.map((lightRail) => buildPlan(direction, interchange, [buildWalkLeg(interchange, direction, lightRail.start - TRANSFER_BUFFER_MINUTES - walkingMinutes), lightRail]));
  }

  const trains = await findTrainLegs(deps, origin, railStation, requested, LIGHT_RAIL_OPTIONS, state);
  return trains
    .map((train) => {
      const walk = buildWalkLeg(interchange, direction, train.end);
      if (endsAtInterchange) return buildPlan(direction, interchange, [train, walk]);
      const [lightRail] = findLightRailLegs(deps, lightRailStation, destination, train.end + walkingMinutes + TRANSFER_BUFFER_MINUTES, 1);
      return lightRail ? buildPlan(direction, interchange, [train, walk, lightRail]) : undefined;
    })
    .filter(Boolean);
}

// Keeps only plans that no other plan beats by both leaving later (or equal) and arriving earlier (or equal), earliest arrival first.
function selectBestPlans(plans: readonly TimedPlan[], limit: number): RailTripPlan[] {
  const sorted = [...plans].sort((a, b) => a.end - b.end || b.start - a.start);
  const selected: TimedPlan[] = [];
  for (const plan of sorted) {
    if (selected.some(({ start }) => start >= plan.start)) continue;
    selected.push(plan);
  }
  return selected.slice(0, limit).map(({ plan }) => plan);
}

export async function planRailTrip(deps: PlanRailTripDeps, { origin, destination, date, time, limit = DEFAULT_PLANS_LIMIT }: PlanRailTripParams): Promise<PlanRailTripResult> {
  const requested = toStamp(date, time);
  const state: SearchState = { messages: new Set(), failed: false };

  const perInterchange = await Promise.all(
    deps.interchanges.map((interchange) => {
      if (origin.kind === 'light_rail' && destination.kind === 'rail') return planLightRailThenTrain(deps, origin.station, destination.station, interchange, requested, state);
      if (origin.kind === 'rail' && destination.kind === 'light_rail') return planTrainThenLightRail(deps, origin.station, destination.station, interchange, requested, state);
      return Promise.resolve<TimedPlan[]>([]);
    }),
  );

  const plans = selectBestPlans(perInterchange.flat(), limit);
  return { plans, messages: [...state.messages], trainSearchFailed: state.failed };
}
