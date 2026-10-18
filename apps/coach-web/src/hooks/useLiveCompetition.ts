import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { LIVE_POLL_MS } from '../lib/polling';
import type { CompetitionDetail } from '../types';
import { type Resource, useResource } from './useResource';

// Loads a competition and keeps polling it while any of its teams are playing.
export function useLiveCompetition(id: number): Resource<CompetitionDetail> {
  const [isLive, setIsLive] = useState(false);
  const resource = useResource(() => api.competition(id), `competition:${id}`, isLive ? LIVE_POLL_MS : undefined);

  useEffect(() => setIsLive(!!resource.data?.tables.some((t) => t.rows.some((r) => r.isLive))), [resource.data]);

  return resource;
}
