import { z } from 'zod';

const globeEventSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('opened') }),
  z.object({ event: z.literal('round_started'), mode: z.string().min(1).max(60) }),
  z.object({ event: z.literal('round_finished'), mode: z.string().min(1).max(60), score: z.number().int().min(0).max(1000), outOf: z.number().int().min(0).max(1000) }),
]);

export type GlobeEvent = z.infer<typeof globeEventSchema>;

export function parseGlobeEvent(body: unknown): GlobeEvent | null {
  const result = globeEventSchema.safeParse(body);
  return result.success ? result.data : null;
}
