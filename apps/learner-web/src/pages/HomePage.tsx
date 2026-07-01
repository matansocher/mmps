import { useLocation } from 'wouter';
import { ORDERED_COURSES } from '../data/courses';
import { useProgress } from '../lib/progress';
import { haptic, hideBackButton } from '../lib/telegram';
import { useEffect } from 'react';

export function HomePage() {
  const [, navigate] = useLocation();
  const { readCount, isRead } = useProgress();

  useEffect(() => {
    hideBackButton();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6">
      <h1 className="text-xl font-bold text-text-primary">AI Engineering Courses</h1>
      <p className="mt-1 text-sm text-text-muted">Tap a course to jump into the next lesson you haven't learned yet.</p>

      <div className="mt-5 flex flex-col gap-3">
        {ORDERED_COURSES.map((course) => {
          const total = course.lessons.length;
          const done = readCount(course.id);
          const complete = done >= total;

          return (
            <button
              key={course.id}
              onClick={() => {
                haptic('select');
                navigate(`/course/${course.id}`);
              }}
              className="group flex items-center gap-4 rounded-2xl border border-border-subtle bg-bg-card text-left transition-colors hover:border-border-strong"
              style={{ padding: '5px 8px 5px 5px' }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${course.color}22` }}
              >
                {course.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-text-primary">{course.title}</h2>
                  {complete && <span className="text-sm text-accent-success">✓</span>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 flex-wrap gap-1">
                    {course.lessons.map((lesson) => (
                      <span
                        key={lesson.id}
                        className={`h-2.5 w-2.5 rounded-sm ${isRead(course.id, lesson.id) ? 'bg-accent-success' : 'bg-bg-elevated'}`}
                      />
                    ))}
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-text-muted">
                    {done}/{total}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
