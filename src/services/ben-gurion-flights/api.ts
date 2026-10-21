import axios from 'axios';
import { BEN_GURION_FLIGHTS_RESOURCE_ID, BEN_GURION_FLIGHTS_URL, REQUEST_TIMEOUT_MS } from './constants';
import type { BenGurionFlight, IaaFlightRecord, IaaFlightsResponse, ParsedFlightNumber } from './types';

// Accepts "LY001", "ly 1", "LY-315", "6H 884" (2-char IATA airline code + up to 4 digits).
const FLIGHT_NUMBER_PATTERN = /^([A-Z]{2}|[A-Z]\d|\d[A-Z])(\d{1,4})$/;

export function parseFlightNumber(input: string): ParsedFlightNumber | null {
  const match = input.toUpperCase().replace(/[\s-]/g, '').match(FLIGHT_NUMBER_PATTERN);
  if (!match) return null;
  return { airlineCode: match[1], number: String(Number(match[2])) };
}

function toFlight(record: IaaFlightRecord): BenGurionFlight {
  return {
    flightNumber: `${record.CHOPER} ${record.CHFLTN}`,
    airline: record.CHOPERD,
    direction: record.CHAORD === 'D' ? 'departure' : 'arrival',
    scheduledTime: record.CHSTOL.slice(0, 16),
    estimatedTime: (record.CHPTOL || record.CHSTOL).slice(0, 16),
    city: { en: record.CHLOC1T, he: record.CHLOC1TH },
    country: { en: record.CHLOCCT, he: record.CHLOC1CH },
    terminal: record.CHTERM,
    status: { en: record.CHRMINE, he: record.CHRMINH },
    ...(record.CHCINT && { checkInCounters: record.CHCINT }),
    ...(record.CHCKZN && { checkInZone: record.CHCKZN }),
  };
}

export async function findBenGurionFlights(flightNumber: string): Promise<BenGurionFlight[]> {
  const parsed = parseFlightNumber(flightNumber);
  if (!parsed) return [];

  // The board zero-pads flight numbers to at least 3 digits ("001"), so match every padding.
  const numbers = [...new Set([parsed.number, parsed.number.padStart(3, '0'), parsed.number.padStart(4, '0')])];
  const params = {
    resource_id: BEN_GURION_FLIGHTS_RESOURCE_ID,
    filters: JSON.stringify({ CHOPER: parsed.airlineCode, CHFLTN: numbers }),
    sort: 'CHSTOL asc',
    limit: 50,
  };
  const { data } = await axios.get<IaaFlightsResponse>(BEN_GURION_FLIGHTS_URL, { params, timeout: REQUEST_TIMEOUT_MS });
  if (!data?.success || !Array.isArray(data.result?.records)) {
    throw new Error('Ben Gurion flights board returned an unexpected response');
  }
  return data.result.records.map(toFlight);
}
