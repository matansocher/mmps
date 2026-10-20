export type LightRailStation = {
  readonly id: string;
  readonly nameHe: string;
  readonly nameEn: string;
  readonly lat: number;
  readonly lon: number;
};

export type LightRailServiceCalendar = {
  readonly id: string;
  readonly days: readonly boolean[]; // Index 0 = Sunday
  readonly startDate: string; // Format: "YYYYMMDD"
  readonly endDate: string; // Format: "YYYYMMDD"
};

export type LightRailTrip = {
  readonly serviceId: string;
  readonly stops: readonly (readonly [number, number])[]; // [station index, departure seconds after service-day midnight (may exceed 24h)]
};

export type LightRailTimetable = {
  readonly builtAt: number;
  readonly stations: readonly LightRailStation[];
  readonly services: readonly LightRailServiceCalendar[];
  readonly trips: readonly LightRailTrip[];
};

export type LightRailDeparture = {
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly departureTime: string; // Format: "HH:mm"
  readonly arrivalTime: string; // Format: "HH:mm"
  readonly durationMinutes: number;
  readonly stopsCount: number;
  readonly terminus: LightRailStation;
};

export type FindDeparturesParams = {
  readonly fromStationId: string;
  readonly toStationId: string;
  readonly date: string; // Format: "YYYY-MM-DD"
  readonly time: string; // Format: "HH:mm"
  readonly limit?: number;
};

export type GeoPoint = {
  readonly lat: number;
  readonly lon: number;
};

export type NearbyLightRailStation = {
  readonly station: LightRailStation;
  readonly straightLineMeters: number;
  readonly walkingMeters: number;
  readonly walkingMinutes: number;
  readonly walkingIsEstimate: boolean;
};

export type NearbyLightRailResult = {
  readonly origin: GeoPoint & { readonly label?: string };
  readonly stations: NearbyLightRailStation[];
};

export type WalkingRoute = {
  readonly meters: number;
  readonly minutes: number;
};
