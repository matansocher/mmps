import { useEffect } from 'react';
import type { Course } from '../data/courses';

type Props = {
  readonly course: Course;
  readonly currentStep: number;
  readonly hasQuiz: boolean;
  readonly isRead: (courseId: string, lessonId: string) => boolean;
  readonly onSelect: (step: number) => void;
  readonly onClose: () => void;
};

export function ChapterSheet({ course, currentStep, hasQuiz, isRead, onSelect, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl border-t border-border-subtle bg-bg-card animate-slide-up">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-base font-semibold text-text-primary">Chapters</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-text-muted hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {course.lessons.map((lesson, i) => {
            const active = i === currentStep;
            const read = isRead(course.id, lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => onSelect(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                  active ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    read ? 'border-accent-success text-accent-success' : 'border-border-strong text-text-muted'
                  }`}
                >
                  {read ? '✓' : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${active ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>{lesson.title}</span>
                  <span className="block truncate text-xs text-text-muted">{lesson.group}</span>
                </span>
              </button>
            );
          })}

          {hasQuiz && (
            <button
              onClick={() => onSelect(course.lessons.length)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                currentStep === course.lessons.length ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent-primary text-xs text-accent-primary">🧠</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${currentStep === course.lessons.length ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>Final Quiz</span>
                <span className="block text-xs text-text-muted">{course.quizzes.length} questions</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
