import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CompetitionDetail } from '../types';
import { useDashboard } from './useDashboard';
import { type Resource, useResource } from './useResource';

// Loads a competition and keeps polling it at the user's refresh interval while any of its teams are playing.
export function useLiveCompetition(id: number): Resource<CompetitionDetail> {
  const { refreshIntervalSec } = useDashboard();
  const [isLive, setIsLive] = useState(false);
  const resource = useResource(() => api.competition(id), `competition:${id}`, isLive ? refreshIntervalSec * 1000 : undefined);

  useEffect(() => setIsLive(!!resource.data?.tables.some((t) => t.rows.some((r) => r.isLive))), [resource.data]);

  return resource;
}
