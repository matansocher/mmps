import { SpanishChallenge, SpanishLesson } from '../types';

export const EMERGENCY_FALLBACK_LESSON: SpanishLesson = {
  topic: 'Emergency Fallback',
  spanish: 'No hay mal que por bien no venga',
  literal: 'There is no bad from which good does not come',
  meaning: 'Every cloud has a silver lining',
  example: 'Perdí mi trabajo, pero no hay mal que por bien no venga - encontré uno mejor',
  exampleTranslation: 'I lost my job, but every cloud has a silver lining - I found a better one',
  pronunciation: 'no-AH-ee mahl keh por bee-EHN no VEHN-gah',
  culturalNote: 'A common Spanish proverb used to stay positive in difficult situations',
  emoji: '☁️',
  difficulty: 'intermediate',
};

export const EMERGENCY_FALLBACK_CHALLENGE: SpanishChallenge = {
  type: 'multiple_choice',
  question: 'What does "¿Qué tal?" mean in Spanish?',
  context: "A common greeting you'll hear everywhere in Spain",
  options: [
    { text: 'How are you?', isCorrect: true },
    { text: 'What time?', isCorrect: false },
    { text: 'How much?', isCorrect: false },
    { text: 'What thing?', isCorrect: false },
  ],
  correctAnswer: 'How are you?',
  explanation: '"¿Qué tal?" is one of the most common informal greetings in Spanish, similar to "How\'s it going?" in English.',
  hint: 'Think about what you say when you meet a friend...',
  funFact: 'In Latin America, you might hear "¿Qué onda?" instead, which literally means "What wave?"',
  emoji: '👋',
};
