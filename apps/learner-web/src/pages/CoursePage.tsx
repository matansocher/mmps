import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { ChapterSheet } from '../components/ChapterSheet';
import { QuizSection } from '../components/Quiz';
import { getCourse, type Course } from '../data/courses';
import { firstUnreadIndex, useProgress } from '../lib/progress';
import { haptic, showBackButton } from '../lib/telegram';

export function CoursePage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { loaded } = useProgress();
  const course = getCourse(params.id ?? '');

  if (!course) {
    return <div className="p-6 text-text-secondary">Course not found.</div>;
  }
  if (!loaded) {
    return <div className="p-6 text-text-muted">Loading…</div>;
  }
  return <CourseReader course={course} onExit={() => navigate('/')} />;
}

function CourseReader({ course, onExit }: { readonly course: Course; readonly onExit: () => void }) {
  const { isRead, toggle } = useProgress();
  const hasQuiz = course.quizzes.length > 0;
  const lastStep = course.lessons.length - 1 + (hasQuiz ? 1 : 0);

  const [step, setStep] = useState(() => Math.min(firstUnreadIndex(course, isRead), lastStep));
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Telegram hardware back button exits the course back to the home list.
  useEffect(() => showBackButton(onExit), [onExit]);

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [step]);

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(next, lastStep)));
    setSheetOpen(false);
  };

  const isQuizStep = hasQuiz && step === course.lessons.length;
  const lesson = isQuizStep ? null : course.lessons[step];
  const read = lesson ? isRead(course.id, lesson.id) : false;

  return (
    <div ref={scrollRef} className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border-subtle bg-bg-base/90 px-3 py-3 backdrop-blur">
        <button onClick={onExit} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-elevated">
          ‹
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{course.icon}</span>
            <span className="truncate text-sm font-semibold text-text-primary">{course.title}</span>
          </div>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-strong"
        >
          ☰ Chapters
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {isQuizStep ? (
          <QuizSection quizzes={course.quizzes} />
        ) : (
          lesson && (
            <>
              <article className="course-content">
                <span className="badge">{lesson.group}</span>
                <h2 className="lesson-title">{lesson.title}</h2>
                <p className="lesson-lede">{lesson.lede}</p>
                <div dangerouslySetInnerHTML={{ __html: lesson.html }} />
              </article>
              <button
                onClick={() => {
                  toggle(course.id, lesson.id);
                  haptic(read ? 'select' : 'success');
                }}
                className={`mt-8 w-full rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  read
                    ? 'border-border-strong bg-bg-elevated text-text-secondary'
                    : 'border-accent-success bg-accent-success/15 text-accent-success'
                }`}
              >
                {read ? '✓ Learned — tap to unmark' : 'Mark as learned'}
              </button>
            </>
          )
        )}
      </main>

      <footer className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border-subtle bg-bg-base/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary disabled:opacity-30"
        >
          ‹ Prev
        </button>
        <span className="text-xs text-text-muted">{isQuizStep ? 'Quiz' : `${step + 1} / ${course.lessons.length}`}</span>
        <button
          onClick={() => goTo(step + 1)}
          disabled={step === lastStep}
          className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary disabled:opacity-30"
        >
          Next ›
        </button>
      </footer>

      {sheetOpen && (
        <ChapterSheet
          course={course}
          currentStep={step}
          hasQuiz={hasQuiz}
          isRead={isRead}
          onSelect={goTo}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
