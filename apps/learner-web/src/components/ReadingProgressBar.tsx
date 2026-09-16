type ReadingProgressBarProps = {
  readonly percent: number;
};

export function ReadingProgressBar({ percent }: ReadingProgressBarProps) {
  const rounded = Math.round(percent);
  return (
    <div className="reading-progress" role="presentation">
      <div
        className="reading-progress-track"
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={rounded}
        aria-valuetext={`${rounded}% read`}
      >
        <div className="reading-progress-fill" style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
    </div>
  );
}
