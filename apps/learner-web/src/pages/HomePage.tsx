import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { ORDERED_COURSES } from '../data/courses';
import { useProgress } from '../lib/progress';
import { BookOpen, ChevronRight, Flame, Sparkles, Trophy } from '../lib/icons';
import { haptic, hideBackButton } from '../lib/telegram';

function ProgressRing({ pct, size = 60 }: { readonly pct: number; readonly size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#232935" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#7c8cff"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)' }}
      />
    </svg>
  );
}

export function HomePage() {
  const [, navigate] = useLocation();
  const { readCount } = useProgress();

  useEffect(() => {
    hideBackButton();
  }, []);

  const stats = ORDERED_COURSES.reduce(
    (acc, course) => {
      const total = course.lessons.length;
      const done = readCount(course.id);
      acc.totalLessons += total;
      acc.learnedLessons += done;
      if (done >= total) acc.completed += 1;
      else if (done > 0) acc.inProgress += 1;
      return acc;
    },
    { totalLessons: 0, learnedLessons: 0, completed: 0, inProgress: 0 },
  );
  const overallPct = stats.totalLessons ? Math.round((stats.learnedLessons / stats.totalLessons) * 100) : 0;

  // "Continue" = the in-progress course with the most momentum (Zeigarnik effect);
  // otherwise the first course you haven't finished; otherwise the very first.
  const inProgress = ORDERED_COURSES.filter((c) => {
    const d = readCount(c.id);
    return d > 0 && d < c.lessons.length;
  }).sort((a, b) => readCount(b.id) - readCount(a.id));
  const firstUnfinished = ORDERED_COURSES.find((c) => readCount(c.id) < c.lessons.length);
  const resume = inProgress[0] ?? firstUnfinished ?? ORDERED_COURSES[0];
  const resumeDone = resume ? readCount(resume.id) : 0;
  const resumeStarted = resumeDone > 0;

  const open = (id: string) => {
    haptic('select');
    navigate(`/course/${id}`);
  };

  const greeting = stats.learnedLessons === 0 ? 'Start your journey' : overallPct === 100 ? 'You finished everything' : 'Welcome back';

  return (
    <div className="w-full pb-16">
      {/* Hero — full-bleed band */}
      <div className="relative overflow-hidden border-b border-border-subtle bg-bg-card/40">
        <div className="ambient animate-float" style={{ width: 260, height: 260, left: -80, top: -70, background: '#7c8cff' }} />
        <div className="ambient animate-float" style={{ width: 220, height: 220, right: -70, top: -20, background: '#5ee88a', animationDelay: '3s' }} />

        <div className="relative mx-auto w-full max-w-2xl px-4 pb-6 pt-9">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <ProgressRing pct={overallPct} />
              <span className="absolute text-sm font-extrabold tabular-nums text-text-primary">{overallPct}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">{greeting}</p>
              <h1 className="mt-0.5 text-2xl font-extrabold leading-tight text-text-primary">AI Engineering Mastery</h1>
              <p className="mt-1 text-sm text-text-muted">Bite-sized lessons that make you interview-ready.</p>
            </div>
          </div>

          {/* Stat chips */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <StatChip icon={<BookOpen size={16} className="text-accent-primary" />} value={stats.learnedLessons} label="Lessons" />
            <StatChip icon={<Trophy size={16} className="text-accent-warning" />} value={stats.completed} label="Completed" />
            <StatChip icon={<Flame size={16} className="text-accent-success" />} value={stats.inProgress} label="In progress" />
          </div>
        </div>
      </div>

      {/* Content container */}
      <div className="mx-auto w-full max-w-2xl px-4">
      {/* Continue learning */}
      {resume && (
        <button
          onClick={() => open(resume.id)}
          className="pressable group relative mt-6 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-accent-primary/40 bg-bg-card p-4 text-left shadow-glow"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: `radial-gradient(400px 120px at 0% 0%, ${resume.color}22, transparent 70%)` }}
          />
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ backgroundColor: `${resume.color}22` }}>
            {resume.icon}
          </span>
          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent-primary">
              <Sparkles size={13} /> {resumeStarted ? 'Continue learning' : 'Start here'}
            </div>
            <h2 className="mt-1 truncate text-base font-bold text-text-primary">{resume.title}</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              {resumeStarted ? `Lesson ${Math.min(resumeDone + 1, resume.lessons.length)} of ${resume.lessons.length}` : `${resume.lessons.length} lessons · ${resume.quizzes.length} quizzes`}
            </p>
          </div>
          <ChevronRight className="relative shrink-0 text-accent-primary transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      {/* All courses */}
      <div className="mt-8 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">All courses</h3>
        <span className="text-xs text-text-muted">{ORDERED_COURSES.length} tracks</span>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {ORDERED_COURSES.map((course) => {
          const total = course.lessons.length;
          const done = readCount(course.id);
          const complete = done >= total;
          const pct = total ? Math.round((done / total) * 100) : 0;

          return (
            <button
              key={course.id}
              onClick={() => open(course.id)}
              className="pressable group flex items-center gap-3.5 rounded-2xl border border-border-subtle bg-bg-card p-2.5 text-left hover:border-border-strong hover:shadow-lift"
            >
              <span
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: `${course.color}1f`, boxShadow: complete ? `inset 0 0 0 1.5px ${course.color}` : undefined }}
              >
                {course.icon}
                {complete && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-success text-bg-base">
                    <Trophy size={11} className="text-bg-base" />
                  </span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-bold text-text-primary">{course.title}</h2>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-elevated">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: complete ? '#5ee88a' : `linear-gradient(90deg, ${course.color}, #7c8cff)`,
                        transition: 'width 500ms cubic-bezier(0.16,1,0.3,1)',
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-text-muted">
                    {done}/{total}
                  </span>
                </div>
              </div>

              <ChevronRight size={18} className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function StatChip({ icon, value, label }: { readonly icon: React.ReactNode; readonly value: number; readonly label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-border-subtle bg-bg-card py-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-extrabold tabular-nums text-text-primary">{value}</span>
      </div>
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
    </div>
  );
}
