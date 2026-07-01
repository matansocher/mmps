import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { ChapterSheet } from '../components/ChapterSheet';
import { QuizSection } from '../components/Quiz';
import { getCourse, type Course } from '../data/courses';
import { firstUnreadIndex, useProgress } from '../lib/progress';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, List, Trophy } from '../lib/icons';
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
  const { isRead, toggle, readCount } = useProgress();
  const hasQuiz = course.quizzes.length > 0;
  const lastStep = course.lessons.length - 1 + (hasQuiz ? 1 : 0);

  const [step, setStep] = useState(() => Math.min(firstUnreadIndex(course, isRead), lastStep));
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [celebrate, setCelebrate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Telegram hardware back button exits the course back to the home list.
  useEffect(() => showBackButton(onExit), [onExit]);

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    setScrollPct(0);
  }, [step]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(next, lastStep)));
    setSheetOpen(false);
  };

  const isQuizStep = hasQuiz && step === course.lessons.length;
  const lesson = isQuizStep ? null : course.lessons[step];
  const read = lesson ? isRead(course.id, lesson.id) : false;

  const onToggle = () => {
    if (!lesson) return;
    const wasRead = read;
    toggle(course.id, lesson.id);
    haptic(wasRead ? 'select' : 'success');
    // Celebrate when this marks the final remaining lesson of the course.
    if (!wasRead && readCount(course.id) + 1 >= course.lessons.length) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2600);
    }
  };

  return (
    <div ref={scrollRef} className="flex min-h-screen flex-col">
      {/* Reading progress bar */}
      <div className="fixed left-0 right-0 top-0 z-40 h-0.5 bg-transparent">
        <div className="read-progress h-full bg-accent-primary" style={{ width: `${scrollPct}%` }} />
      </div>

      <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex w-full max-w-2xl items-center px-3 py-2.5">
          <button onClick={onExit} aria-label="Back to courses" className="pressable flex items-center gap-1.5 rounded-xl py-1 pl-1 pr-3 text-sm font-medium text-text-secondary hover:bg-bg-elevated">
            <ArrowLeft />
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-6 pt-5">
        {/* Course header — part of the page content */}
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl" style={{ backgroundColor: `${course.color}1f` }}>
            {course.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-extrabold text-text-primary">{course.title}</h1>
            <p className="text-xs font-medium text-text-muted">{isQuizStep ? `Final quiz · ${course.quizzes.length} questions` : `Lesson ${step + 1} of ${course.lessons.length}`}</p>
          </div>
        </div>

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
                onClick={onToggle}
                className={`pressable mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold ${
                  read ? 'border-border-strong bg-bg-elevated text-text-secondary' : 'border-accent-success bg-accent-success/15 text-accent-success shadow-glow-success'
                }`}
              >
                {read ? (
                  <>
                    <Check size={16} /> Learned — tap to unmark
                  </>
                ) : (
                  <>
                    <Check size={16} /> Mark as learned
                  </>
                )}
              </button>
            </>
          )
        )}
      </main>

      <footer className="sticky bottom-0 z-30 border-t border-border-subtle bg-bg-base/85 backdrop-blur-md" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 px-3 py-2.5">
          <button
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
            aria-label="Previous"
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle text-text-secondary disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-subtle px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-border-strong"
          >
            <List size={16} />
            {isQuizStep ? 'Final Quiz' : `Chapter ${step + 1} / ${course.lessons.length}`}
          </button>
          <button
            onClick={() => goTo(step + 1)}
            disabled={step === lastStep}
            aria-label="Next"
            className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle text-text-secondary disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>

      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="animate-pop-in flex flex-col items-center gap-3 rounded-3xl border border-accent-success/40 bg-bg-card px-8 py-7 text-center shadow-glow-success">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-success/15 text-accent-success">
              <Trophy size={32} />
            </span>
            <h3 className="text-lg font-extrabold text-text-primary">Course complete!</h3>
            <p className="max-w-[16rem] text-sm text-text-muted">You mastered every lesson in {course.title}. {hasQuiz ? 'Try the final quiz to prove it.' : 'On to the next one!'}</p>
          </div>
        </div>
      )}

      {sheetOpen && <ChapterSheet course={course} currentStep={step} hasQuiz={hasQuiz} isRead={isRead} onSelect={goTo} onClose={() => setSheetOpen(false)} />}
    </div>
  );
}
