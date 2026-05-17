import type { Topic, Level } from '../types';

type Props = {
  topic: Topic;
  label: string;
  levels: Array<{ level: Level; label: string; questionCount: number }>;
  onPick: (topic: Topic, level: Level) => void;
};

export function TopicCard({ topic, label, levels, onPick }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="text-white font-semibold mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {levels.map((lvl) => {
          const enabled = lvl.questionCount > 0;
          return (
            <button
              key={lvl.level}
              disabled={!enabled}
              onClick={() => onPick(topic, lvl.level)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                enabled
                  ? 'border-primary-500 text-primary-300 hover:bg-primary-500/10'
                  : 'border-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {lvl.label} <span className="opacity-60 ml-1">{lvl.questionCount}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
