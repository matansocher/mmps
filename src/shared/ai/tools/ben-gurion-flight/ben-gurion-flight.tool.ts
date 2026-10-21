import { tool } from '@langchain/core/tools';
import { addMinutes, format, getDay, parse } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { DEFAULT_TIMEZONE } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { findBenGurionFlights, parseFlightNumber } from '@services/ben-gurion-flights';
import type { BenGurionFlight, FlightDirection } from '@services/ben-gurion-flights';

const logger = new Logger('BenGurionFlightTool');

const BEN_GURION_STATION = { id: 8600, nameEn: 'Ben Gurion Airport', nameHe: 'נמל תעופה בן גוריון' };
// Be at the terminal 3 hours before an international departure; leave the airport station about an hour after landing (passport control and baggage).
export const DEFAULT_BUFFER_MINUTES: Readonly<Record<FlightDirection, number>> = { departure: 180, arrival: 60 };
const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm";

const schema = z.object({
  flightNumber: z
    .string()
    .optional()
    .describe('Flight number with the 2-character IATA airline code, e.g. "LY001", "LY 315", "6H 884", "W6 2812". Convert airline names to the code (El Al → LY, Israir → 6H, Arkia → IZ)'),
  direction: z.enum(['departure', 'arrival']).optional().describe('"departure": the user flies out of Ben Gurion. "arrival": the user lands at Ben Gurion. Required when there is no flightNumber'),
  date: z.string().optional().describe('Flight date in YYYY-MM-DD format, Israel time. Omit for the next upcoming flight / today'),
  time: z.string().optional().describe('Flight departure or landing time in HH:mm (24h) format, Israel time, when the user gave a time instead of a flight number'),
  bufferMinutes: z
    .number()
    .int()
    .min(0)
    .max(360)
    .optional()
    .describe('Only if the user asked for a different margin: minutes to be at the airport before departure (default 180), or minutes after landing before taking the train (default 60)'),
});

export type FlightTrainPlan = {
  readonly direction: FlightDirection;
  readonly flightTime: string; // Format: "YYYY-MM-DDTHH:mm"
  readonly bufferMinutes: number;
  readonly trainSearch: {
    readonly from?: string;
    readonly to?: string;
    readonly arriveBy?: boolean;
    readonly date: string; // Format: "YYYY-MM-DD"
    readonly time: string; // Format: "HH:mm"
  };
  readonly shabbatWarning: boolean;
};

// Israel Railways stops on Friday afternoon and restarts on Saturday evening (approximate, varies by season).
export function isLikelyShabbatGap(dateTime: Date): boolean {
  const day = getDay(dateTime);
  const hour = dateTime.getHours();
  return (day === 5 && hour >= 14) || (day === 6 && hour < 21);
}

export function planFlightTrain(direction: FlightDirection, flightTime: string, bufferMinutes = DEFAULT_BUFFER_MINUTES[direction]): FlightTrainPlan {
  const flight = parse(flightTime, DATE_TIME_FORMAT, new Date());
  const train = addMinutes(flight, direction === 'departure' ? -bufferMinutes : bufferMinutes);
  const date = format(train, 'yyyy-MM-dd');
  const time = format(train, 'HH:mm');
  const trainSearch = direction === 'departure' ? { to: BEN_GURION_STATION.nameEn, arriveBy: true, date, time } : { from: BEN_GURION_STATION.nameEn, date, time };
  return { direction, flightTime, bufferMinutes, trainSearch, shabbatWarning: isLikelyShabbatGap(train) };
}

export function pickFlight(flights: readonly BenGurionFlight[], now: string): BenGurionFlight | undefined {
  return flights.find((flight) => flight.estimatedTime >= now) ?? flights[flights.length - 1];
}

async function lookupFlight({ flightNumber, direction, date }: z.infer<typeof schema>): Promise<{ readonly flight?: BenGurionFlight; readonly others?: BenGurionFlight[]; readonly error?: string }> {
  if (!parseFlightNumber(flightNumber)) {
    return { error: `"${flightNumber}" is not a valid flight number. Ask for the airline code and number (e.g. LY 315), or for the flight time` };
  }
  let flights: BenGurionFlight[];
  try {
    flights = await findBenGurionFlights(flightNumber);
  } catch (err) {
    logger.error(`Flight lookup failed for "${flightNumber}": ${getErrorMessage(err)}`);
    return { error: 'The Ben Gurion flights board is unavailable right now. Ask the user for the flight time and call again with direction + time' };
  }
  const matching = flights.filter((flight) => (!direction || flight.direction === direction) && (!date || flight.scheduledTime.startsWith(date)));
  if (!matching.length) {
    return {
      error: `Flight ${flightNumber} was not found on the Ben Gurion board${date ? ` on ${date}` : ''} (it only lists the next few days). Ask the user for the flight time and call again with direction + date + time`,
    };
  }
  const now = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), DATE_TIME_FORMAT);
  const flight = pickFlight(matching, now);
  return { flight, others: matching.filter((item) => item !== flight).slice(0, 3) };
}

async function runner(input: z.infer<typeof schema>) {
  const { flightNumber, direction, date, time, bufferMinutes } = input;
  if (flightNumber?.trim()) {
    const { flight, others, error } = await lookupFlight(input);
    if (error) return { error };
    return {
      flight,
      ...(others.length && { otherDates: others.map(({ direction, scheduledTime, estimatedTime }) => ({ direction, scheduledTime, estimatedTime })) }),
      ...planFlightTrain(flight.direction, flight.estimatedTime, bufferMinutes),
    };
  }
  if (!direction || !time) {
    return { error: 'Provide a flightNumber, or direction (departure/arrival) and the flight time' };
  }
  const flightDate = date ?? format(toZonedTime(new Date(), DEFAULT_TIMEZONE), 'yyyy-MM-dd');
  return planFlightTrain(direction, `${flightDate}T${time.padStart(5, '0')}`, bufferMinutes);
}

export const benGurionFlightTool = tool(runner, {
  name: 'ben_gurion_flight',
  description: `Plan the train to or from Ben Gurion Airport (נתב״ג) around a flight. Looks up a flight number on the live Israel Airports Authority board (scheduled and updated time, terminal, status, check-in counters) and works out the train search: for a departure, the latest arrival at the airport station (default 3 hours before the flight); for an arrival, the earliest train from the airport (default 1 hour after landing).
Rules:
- Use it whenever the user mentions a flight from or to Ben Gurion ("יש לי טיסה ב-14:00", "I fly LY 315 tomorrow", "I land at 6 am, how do I get to Haifa?"). Pass flightNumber when given, otherwise direction + date + time.
- Then ALWAYS call israel_rail with trainSearch: for a departure, from = the user's station (or fromPlace), to = trainSearch.to, arriveBy = true, date/time = trainSearch; for an arrival, from = trainSearch.from, to = the user's station (or toPlace), date/time = trainSearch. If you don't know where the user travels from / to, ask first.
- Reply: the flight (number, destination/origin city, time - say if the updated time differs from the scheduled one - terminal, status, check-in counters), then the recommended train: for a departure, the LAST train that arrives by trainSearch.time, with one or two earlier options; for an arrival, the first trains after trainSearch.time. Mention the margin (e.g. "3 hours before the flight").
- If shabbatWarning is true or israel_rail returns no trains, explain there is likely no train service then (Shabbat or a holiday) and suggest a taxi or an earlier train. If the nearest train leaves a big gap (over ~1.5 hours early, or a long wait after landing), say so.
- If otherDates is present and the user did not give a date, mention the flight date you used.
- If the result has an error, follow its instructions.`,
  schema,
});
