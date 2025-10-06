import { SummaryDetails } from '../types';

export function generateSummaryMessage(summaryDetails: SummaryDetails): string {
  if (!summaryDetails) {
    return 'No summary available';
  }

  const { topicTitle, summary, keyTakeaways, practicalApplications, nextSteps } = summaryDetails;

  const sections = [
    `📚 *Course Summary: ${topicTitle}*\n`,
    `${summary}\n`,
    `*🎯 Key Takeaways:*`,
    ...keyTakeaways.map((takeaway, index) => `${index + 1}. ${takeaway}`),
    `\n*💡 Practical Applications:*`,
    ...practicalApplications.map((app, index) => `${index + 1}. ${app}`),
    `\n*🚀 Next Steps:*`,
    ...nextSteps.map((step, index) => `${index + 1}. ${step}`),
  ];

  return sections.join('\n');
}

export function formatLessonProgress(currentLesson: number, totalLessons: number, lessonsCompleted: number): string {
  const progressBar = generateProgressBar(lessonsCompleted, totalLessons);
  return `📊 Progress: Lesson ${currentLesson}/${totalLessons}\n${progressBar}\n✅ Completed: ${lessonsCompleted}/${totalLessons}`;
}

function generateProgressBar(completed: number, total: number, length: number = 10): string {
  const filledLength = Math.round((completed / total) * length);
  const emptyLength = length - filledLength;
  return '█'.repeat(filledLength) + '░'.repeat(emptyLength);
}
