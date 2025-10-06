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
  const progressBar = generateProgressBar(currentLesson, lessonsCompleted, totalLessons);
  return `📖 *Lesson ${currentLesson} of ${totalLessons}*\n\n${progressBar}`;
}

function generateProgressBar(currentLesson: number, completed: number, total: number): string {
  const circles = [];
  for (let i = 1; i <= total; i++) {
    if (i < currentLesson) {
      circles.push('✅'); // Completed lessons
    } else if (i === currentLesson) {
      circles.push('📍'); // Current lesson
    } else {
      circles.push('⚪️'); // Upcoming lessons
    }
  }
  return circles.join(' ');
}
