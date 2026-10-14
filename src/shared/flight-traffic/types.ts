import type { ObjectId } from 'mongodb';
import type { RadiusQuery } from '@services/adsb';
import type { Country } from '@shared/worldly';

export type CountryGeometry = NonNullable<Country['geometry']>;

export type MonitoredCountry = {
  readonly alpha2: string; // used to look up the border geometry in the Worldly Country collection
  readonly name: string;
  readonly emoji: string;
  readonly mapCenter: { readonly lat: number; readonly lon: number; readonly zoom: number };
  readonly circles: ReadonlyArray<RadiusQuery>; // together they must cover the whole border
};

export type FlightTrafficSample = {
  readonly _id?: ObjectId;
  readonly countryAlpha2: string;
  readonly utcHour: number; // 0-23, baseline bucket
  readonly insideCount: number; // airborne aircraft inside the border
  readonly outsideCount: number; // airborne aircraft in the queried circles but outside the border
  readonly sampledAt: Date;
};

export type FlightTrafficState = {
  readonly _id: string; // country alpha2
  readonly isLowTraffic: boolean;
  readonly lowSince: Date | null;
  readonly updatedAt: Date;
};

export type CountryTrafficSnapshot = {
  readonly insideCount: number;
  readonly outsideCount: number;
  readonly callsigns: ReadonlyArray<string>; // a few aircraft still flying inside the border
};

export type TrafficStatus = 'warming_up' | 'quiet_hour' | 'normal' | 'low';
export type TrafficTransition = 'enter_low' | 'recover' | 'none';

export type TrafficEvaluation = {
  readonly status: TrafficStatus;
  readonly transition: TrafficTransition;
  readonly baselineInside: number | null; // median of same-hour samples
  readonly baselineOutside: number | null;
  readonly ratio: number | null; // inside / baselineInside
  readonly neighbourRatio: number | null; // outside / baselineOutside
};
