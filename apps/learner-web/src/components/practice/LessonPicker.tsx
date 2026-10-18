import { useMemo, useState } from 'react';
import { AppIcon } from '../AppIcon';
import type { GuideId } from '../../lib/types';
import type { PracticeScopeInfo, PracticeScopeLesson } from '../../lib/practice';
import { MAX_SCOPE_LESSONS, scoreColorVar } from '../../lib/practice';

type LessonPickerProps = {
  readonly info: PracticeScopeInfo;
  readonly selected: ReadonlySet<string>;
  readonly readIds: ReadonlySet<string>;
  readonly onChange: (next: Set<string>) => void;
};

export function LessonPicker({ info, selected, readIds, onChange }: LessonPickerProps) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  const groups = useMemo(() => {
    const byGuide = new Map<GuideId, PracticeScopeLesson[]>();
    for (const lesson of info.lessons) {
      if (lesson.questionCount === 0) continue;
      if (normalized && !lesson.title.toLowerCase().includes(normalized)) continue;
      const list = byGuide.get(lesson.guide) ?? [];
      list.push(lesson);
      byGuide.set(lesson.guide, list);
    }
    return info.guides.map((guide) => ({ guide, lessons: byGuide.get(guide.id) ?? [] })).filter((g) => g.lessons.length > 0);
  }, [info, normalized]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_SCOPE_LESSONS) next.add(id);
    onChange(next);
  };

  const setGroup = (lessons: readonly PracticeScopeLesson[], on: boolean) => {
    const next = new Set(selected);
    for (const lesson of lessons) {
      if (on && next.size >= MAX_SCOPE_LESSONS) break;
      if (on) next.add(lesson.id);
      else next.delete(lesson.id);
    }
    onChange(next);
  };

  return (
    <div className="lesson-picker">
      <div className="picker-toolbar">
        <label className="picker-search">
          <AppIcon name="browse" size={17} />
          <input type="search" value={query} placeholder="Search lessons" aria-label="Search lessons" onChange={(e) => setQuery(e.target.value)} />
        </label>
        {selected.size > 0 && (
          <button type="button" className="composer-link" onClick={() => onChange(new Set())}>
            Clear ({selected.size})
          </button>
        )}
      </div>

      {groups.length === 0 && <p className="picker-empty">No lessons match “{query}”.</p>}

      {groups.map(({ guide, lessons }) => {
        const allOn = lessons.every((l) => selected.has(l.id));
        return (
          <section key={guide.id} className="picker-group" aria-labelledby={`picker-${guide.id}`}>
            <header className="picker-group-head">
              <h3 id={`picker-${guide.id}`}>
                <AppIcon name={guide.id} size={17} /> {guide.label}
              </h3>
              <button type="button" className="composer-link" onClick={() => setGroup(lessons, !allOn)}>
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </header>
            <ul className="picker-list">
              {lessons.map((lesson) => {
                const checked = selected.has(lesson.id);
                return (
                  <li key={lesson.id}>
                    <label className={`picker-item${checked ? ' checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(lesson.id)} />
                      <span className="picker-check" aria-hidden="true">
                        {checked && <AppIcon name="check" size={14} />}
                      </span>
                      <span className="picker-title">
                        {lesson.title}
                        {!readIds.has(lesson.id) && <span className="picker-tag">unread</span>}
                      </span>
                      <span className="picker-meta">
                        {lesson.averageScore !== null && (
                          <span className="picker-score" style={{ color: scoreColorVar(lesson.averageScore) }} title="Your average score">
                            {lesson.averageScore}
                          </span>
                        )}
                        <span title="Questions">{lesson.questionCount}Q</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
