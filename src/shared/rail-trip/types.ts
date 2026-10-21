import type { RailStation, RailStationWithLocation, SearchTrainsParams, SearchTrainsResult, TrainTransfer } from '@services/israel-rail';
import type { LightRailStation, LightRailTimetable } from '@services/light-rail';

export type RailTripInterchange = {
  readonly lightRailStation: LightRailStation;
  readonly railStation: RailStationWithLocation;
  readonly straightLineMeters: number;
  readonly walkingMeters: number;
  readonly walkingMinutes: number;
};

export type RailTripEndpoint = { readonly kind: 'light_rail'; readonly station: LightRailStation } | { readonly kind: 'rail'; readonly station: RailStation };

export type RailTripStationRef = {
  readonly nameEn: string;
  readonly nameHe: string;
};

export type RailTripLightRailLeg = {
  readonly mode: 'light_rail';
  readonly from: RailTripStationRef;
  readonly to: RailTripStationRef;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly departureTime: string; // Format: "HH:mm"
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly durationMinutes: number;
  readonly stopsCount: number;
  readonly towards: RailTripStationRef;
};

export type RailTripWalkLeg = {
  readonly mode: 'walk';
  readonly from: RailTripStationRef;
  readonly to: RailTripStationRef;
  readonly startTime: string; // Format: "HH:mm"
  readonly walkingMinutes: number;
  readonly walkingMeters: number;
  readonly transferBufferMinutes: number;
};

export type RailTripTrainLeg = {
  readonly mode: 'train';
  readonly from: RailTripStationRef;
  readonly to: RailTripStationRef;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly departureTime: string; // Format: "HH:mm"
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly durationMinutes: number;
  readonly transfers: number;
  readonly transferDetails: readonly TrainTransfer[];
  readonly trainNumbers: readonly number[];
  readonly originPlatform?: number;
  readonly verifyUrl: string;
};

export type RailTripLeg = RailTripLightRailLeg | RailTripWalkLeg | RailTripTrainLeg;

export type RailTripDirection = 'light_rail_then_train' | 'train_then_light_rail';

export type RailTripPlan = {
  readonly direction: RailTripDirection;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly departureTime: string; // Format: "HH:mm"
  readonly arrivalDate: string; // Format: "YYYY-MM-DD"
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly durationMinutes: number;
  readonly interchange: { readonly lightRail: RailTripStationRef; readonly rail: RailTripStationRef };
  readonly legs: readonly RailTripLeg[];
};

export type PlanRailTripParams = {
  readonly origin: RailTripEndpoint;
  readonly destination: RailTripEndpoint;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly time: string; // Format: "HH:mm"
  readonly limit?: number;
};

export type PlanRailTripDeps = {
  readonly timetable: LightRailTimetable;
  readonly interchanges: readonly RailTripInterchange[];
  readonly searchTrains: (params: SearchTrainsParams) => Promise<SearchTrainsResult>;
};

export type PlanRailTripResult = {
  readonly plans: readonly RailTripPlan[];
  readonly messages: readonly string[];
  readonly trainSearchFailed: boolean;
};
