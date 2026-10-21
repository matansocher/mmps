export type FlightDirection = 'departure' | 'arrival';

export type ParsedFlightNumber = {
  readonly airlineCode: string;
  readonly number: string;
};

export type BenGurionFlight = {
  readonly flightNumber: string; // Format: "LY 001"
  readonly airline: string;
  readonly direction: FlightDirection;
  readonly scheduledTime: string; // Format: "YYYY-MM-DDTHH:mm", Israel time
  readonly estimatedTime: string; // Format: "YYYY-MM-DDTHH:mm", Israel time
  readonly city: { readonly en: string; readonly he: string };
  readonly country: { readonly en: string; readonly he: string };
  readonly terminal: number;
  readonly status: { readonly en: string; readonly he: string };
  readonly checkInCounters?: string;
  readonly checkInZone?: string;
};

export type IaaFlightRecord = {
  readonly CHOPER: string;
  readonly CHFLTN: string;
  readonly CHOPERD: string;
  readonly CHSTOL: string;
  readonly CHPTOL: string;
  readonly CHAORD: 'A' | 'D';
  readonly CHLOC1T: string;
  readonly CHLOC1TH: string;
  readonly CHLOCCT: string;
  readonly CHLOC1CH: string;
  readonly CHTERM: number;
  readonly CHCINT: string;
  readonly CHCKZN: string;
  readonly CHRMINE: string;
  readonly CHRMINH: string;
};

export type IaaFlightsResponse = {
  readonly success: boolean;
  readonly result?: { readonly records: readonly IaaFlightRecord[] };
};
