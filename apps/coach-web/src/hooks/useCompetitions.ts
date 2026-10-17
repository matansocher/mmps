import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getLanguage, type Language } from '../lib/i18n';
import type { CompetitionOption } from '../types';

const cache = new Map<Language, Promise<CompetitionOption[]>>();

function loadCompetitions(): Promise<CompetitionOption[]> {
  const language = getLanguage();
  const cached =
    cache.get(language) ??
    api.competitions().catch((err) => {
      cache.delete(language);
      throw err;
    });
  cache.set(language, cached);
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
