import type { TelegramBotConfig } from '@services/telegram-grammy';

export const BOT_CONFIG: TelegramBotConfig = {
  id: 'MAGISTER',
  name: 'Magister Bot 📚',
  token: 'MAGISTER_TELEGRAM_BOT_TOKEN',
  commands: {
    START: { command: '/start', description: 'Start learning', hide: true },
    COURSE: { command: '/course', description: '📚 Start next course 📚' },
    STATUS: { command: '/status', description: '📊 View progress 📊' },
    NEXT: { command: '/next', description: '➡️ Next lesson ➡️' },
  },
};

export const COURSE_LESSON_HOURS_OF_DAY = [12, 17, 21];
export const COURSE_REMINDER_HOUR_OF_DAY = 23;

export enum BOT_ACTIONS {
  TRANSCRIBE = 'transcribe',
  COMPLETE_LESSON = 'complete_lesson',
  COMPLETE_COURSE = 'complete_course',
  QUIZ = 'quiz',
  QUIZ_ANSWER = 'quiz_answer',
}

export const INLINE_KEYBOARD_SEPARATOR = ' - ';

export const PINECONE_INDEX_NAME = 'scholar-materials';

export const SYSTEM_PROMPT = `
You are a sharp, insightful, and experienced learning mentor specializing in teaching from curated materials.
Your mission is to guide learners through comprehensive learning materials, breaking down complex topics into digestible lessons.
You work from provided source materials and your role is to:
- Extract and present the most important concepts from the materials
- Provide clear, practical explanations with relevant examples
- Connect concepts to real-world applications
- Challenge the learner with thought-provoking questions
- Surface non-obvious insights and nuances

Each lesson should:
- Focus on a specific aspect of the overall topic
- Build progressively on previous lessons
- Include practical examples when relevant to the subject matter
- End with a thought experiment or practical challenge
- Be concise but comprehensive (under 4,096 characters)

Guidelines:
- Assume the learner is motivated and intelligent - focus on depth and understanding
- Use the provided material context to ground your explanations
- Highlight important distinctions, common misconceptions, and practical applications
- Make connections between different concepts in the materials
- Use emojis strategically to structure and emphasize key points
- Prioritize insight and understanding over breadth
- CRITICAL: Always respond in the same language as the original learning material. If the material is in Hebrew, respond in Hebrew. If it's in English, respond in English. Match the language of the source material exactly.

Tone: Confident, direct, and respectful - like an experienced mentor sharing valuable knowledge.
`;

export const LESSON_PROMPT_TEMPLATE = `
Based on the following source materials, teach lesson {lessonNumber} of {totalLessons} on the topic: {topic}

This lesson should cover the next logical progression in understanding this topic.
Previous lessons covered: {previousLessonsContext}

Source Materials:
{materialContext}

Create an engaging, insightful lesson that:
1. Builds on previous lessons
2. Covers new ground from the materials
3. Includes practical examples
4. Ends with a challenge or thought experiment
5. Is written in the SAME LANGUAGE as the source materials above

Keep it under 4,096 characters.
`;

export const SUMMARY_PROMPT = `
Create a comprehensive summary of this entire course for future review.
Include:
1. Overall summary of what was learned (2-3 paragraphs)
2. Key takeaways (5-7 most important points)
3. Practical applications
4. Suggested next steps for deeper learning

This summary should help refresh the learner's memory weeks or months from now.

IMPORTANT: Write this summary in the SAME LANGUAGE as the course materials that were taught throughout the lessons.
`;

export const QUIZ_PROMPT = `
Create an engaging and comprehensive quiz of 5 questions to test the learner's understanding of the entire course.

The questions should:
- Cover key concepts from across ALL lessons (not just the final lesson)
- Test deep understanding, not just memorization
- Be challenging but fair
- Include a mix of question types:
  * Multiple choice questions (4 options)
  * True/False questions

For each question, provide:
1. A clear, well-written question
2. Answer options (4 for multiple choice, 2 for true/false)
3. The correct answer index (0-based)
4. A brief but insightful explanation of why the correct answer is correct (shown to user if they answer incorrectly)

Make the quiz engaging and educational. The explanations should reinforce learning.

IMPORTANT: Write all questions, options, and explanations in the SAME LANGUAGE as the course materials that were taught.
`;
