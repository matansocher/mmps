import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { CompetitionOption } from '../types';

let cached: Promise<CompetitionOption[]> | null = null;

function loadCompetitions(): Promise<CompetitionOption[]> {
  cached ??= api.competitions().catch((err) => {
    cached = null;
    throw err;
  });
  return cached;
}

export function useCompetitions(): CompetitionOption[] | null {
  const [competitions, setCompetitions] = useState<CompetitionOption[] | null>(null);
  useEffect(() => {
    let active = true;
    loadCompetitions()
      .then((list) => active && setCompetitions(list))
      .catch(() => active && setCompetitions([]));
    return () => {
      active = false;
    };
  }, []);
  return competitions;
}
