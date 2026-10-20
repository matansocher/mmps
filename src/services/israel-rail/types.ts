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

export type SearchTrainsParams = {
  readonly fromStationId: number;
  readonly toStationId: number;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly hour: string; // Format: "HH:mm"
  readonly limit?: number;
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
  readonly intermediateStops: number;
};

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
