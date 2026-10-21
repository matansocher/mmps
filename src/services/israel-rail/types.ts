export type RailStation = {
  readonly id: number;
  readonly nameEn: string;
  readonly nameHe: string;
};

export type RailStationWithLocation = RailStation & {
  readonly lat: number;
  readonly lon: number;
};

export type RailApiEtaDiff = {
  readonly stationId: number;
  readonly difMin: number;
};

export type RailApiStopStation = {
  readonly stationId: number;
  readonly arrivalTime: string;
  readonly departureTime: string;
  readonly platform: number;
};

// Only present while the train is running. nextStation is 0 when the train is standing at currentLastStation.
export type RailApiTrainPosition = {
  readonly currentLastStation: number;
  readonly nextStation: number;
  readonly calcDiffMinutes: number;
};

export type RailApiRouteStation = {
  readonly stationId: number;
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly platform: number;
};

export type RailApiTrain = {
  readonly trainNumber: number;
  readonly orignStation: number;
  readonly destinationStation: number;
  readonly originPlatform: number;
  readonly destPlatform: number;
  readonly departureTime: string;
  readonly arrivalTime: string;
  readonly predictedPctLoad?: number;
  readonly handicap?: number;
  readonly stopStations?: readonly RailApiStopStation[];
  readonly etaDiffTimes?: readonly RailApiEtaDiff[];
  readonly trainPosition?: RailApiTrainPosition | null;
  readonly routeStations?: readonly RailApiRouteStation[];
};

export type RailApiTravelMessage = {
  readonly title?: string;
  readonly message?: string;
};

export type RailApiTravel = {
  readonly departureTime: string;
  readonly arrivalTime: string;
  readonly trains: readonly RailApiTrain[];
  readonly travelMessages?: readonly RailApiTravelMessage[];
};

export type RailApiSearchResponse = {
  readonly result: {
    readonly numOfResultsToShow: number;
    readonly startFromIndex: number;
    readonly travels: readonly RailApiTravel[];
  };
};

export type TrainScheduleType = 'departure' | 'arrival';

export type SearchTrainsParams = {
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly hour: string; // Format: "HH:mm" - earliest departure, or latest arrival when scheduleType is "arrival"
  readonly scheduleType?: TrainScheduleType;
  readonly limit?: number;
};

export type TrainStop = {
  readonly station: RailStation;
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly departureTime: string; // Format: "HH:mm"
  readonly platform: number;
};

export type TrainLeg = {
  readonly trainNumber: number;
  readonly from: RailStation;
  readonly to: RailStation;
  readonly departureTime: string; // Format: "HH:mm"
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly originPlatform: number;
  readonly destinationPlatform: number;
  readonly delayMinutes: number;
  readonly predictedLoadPercent?: number;
  readonly crowding?: CrowdingLevel;
  readonly intermediateStops: number;
  readonly stops: readonly TrainStop[];
};

export type CrowdingLevel = 'quiet' | 'moderate' | 'busy';

export type TrainTransfer = {
  readonly station: RailStation;
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly arrivalPlatform: number;
  readonly departureTime: string; // Format: "HH:mm"
  readonly departurePlatform: number;
  readonly waitMinutes: number;
  readonly nextTrainNumber: number;
};

export type TrainTravel = {
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly departureTime: string; // Format: "HH:mm"
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly durationMinutes: number;
  readonly transfers: number;
  readonly transferDetails: readonly TrainTransfer[];
  readonly legs: readonly TrainLeg[];
};

export type SearchTrainsResult = {
  readonly travels: readonly TrainTravel[];
  readonly messages: readonly string[];
};

export type GetTrainLineParams = {
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly hour: string; // Format: "HH:mm"
  readonly trainNumber: number;
};

export type TrainLineStop = {
  readonly station: RailStation;
  readonly time: string; // Format: "HH:mm"
  readonly platform: number;
};

export type TrainLivePosition = {
  readonly lastStationId: number;
  readonly nextStationId: number | null; // null when the train is standing at lastStationId
  readonly delayMinutes: number;
};

// The full line of a single train (every stop, not only the user's segment) with its live position.
export type TrainLine = {
  readonly trainNumber: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly stops: readonly TrainLineStop[];
  readonly boardingStationId: number;
  readonly alightingStationId: number;
  readonly position: TrainLivePosition | null;
};

export type TrainProgressStatus = 'not_started' | 'running' | 'finished';

export type TrainProgress = {
  readonly status: TrainProgressStatus;
  readonly position: number; // Fractional stop index along TrainLine.stops, e.g. 2.4 = 40% of the way from stop 2 to stop 3
  readonly delayMinutes: number;
  readonly isLive: boolean; // false when estimated from the timetable only
};

export type NearbyRailStation = {
  readonly station: RailStationWithLocation;
  readonly straightLineMeters: number;
  readonly walkingMeters: number;
  readonly walkingMinutes: number;
  readonly walkingIsEstimate: boolean;
};

export type NearbyRailStationsResult = {
  readonly origin: { readonly lat: number; readonly lon: number; readonly label?: string };
  readonly stations: NearbyRailStation[];
};
