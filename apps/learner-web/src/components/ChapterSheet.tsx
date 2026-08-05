import { useEffect } from 'react';
import type { Course } from '../data/courses';
import { Brain, Check, Close } from '../lib/icons';

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

  const readTotal = course.lessons.filter((l) => isRead(course.id, l.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="animate-slide-up relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-border-strong bg-bg-card">
        <div className="flex justify-center pt-3">
          <span className="h-1 w-10 rounded-full bg-border-strong" />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-text-primary">Chapters</h2>
            <p className="text-xs text-text-muted">
              {readTotal} of {course.lessons.length} learned
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="pressable flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary">
            <Close />
          </button>
        </div>

        <div className="overflow-y-auto px-2 pb-4">
          {course.lessons.map((lesson, i) => {
            const active = i === currentStep;
            const read = isRead(course.id, lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => onSelect(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    read ? 'border-accent-success bg-accent-success text-bg-base' : active ? 'border-accent-primary text-accent-primary' : 'border-border-strong text-text-muted'
                  }`}
                >
                  {read ? <Check size={14} className="text-bg-base" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${active ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>{lesson.title}</span>
                  <span className="block truncate text-xs text-text-muted">{lesson.group}</span>
                </span>
              </button>
            );
          })}

          {hasQuiz && (
            <button
              onClick={() => onSelect(course.lessons.length)}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${currentStep === course.lessons.length ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-primary text-accent-primary">
                <Brain size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${currentStep === course.lessons.length ? 'font-bold text-text-primary' : 'font-medium text-text-secondary'}`}>Final Quiz</span>
                <span className="block text-xs text-text-muted">{course.quizzes.length} questions</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
