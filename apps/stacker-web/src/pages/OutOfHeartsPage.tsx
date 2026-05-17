import { useLocation } from 'wouter';
import { tgClose } from '../lib/telegram';

export function OutOfHeartsPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">💔</div>
        <h1 className="text-2xl font-bold text-white mb-3">Out of hearts</h1>
        <p className="text-gray-400 mb-6">
          You ran out of hearts. They refill on a new day — come back tomorrow.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-xl"
          >
            Back to topics
          </button>
          <button
            onClick={tgClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
