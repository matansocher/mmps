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

export function formatLessonProgress(currentLesson: number, totalLessons: number): string {
  const progressBar = generateProgressBar(currentLesson, totalLessons);
  return `📖 *Lesson ${currentLesson} of ${totalLessons}*\n\n${progressBar}`;
}

function generateProgressBar(currentLesson: number, total: number): string {
  const completed = currentLesson - 1;
  const percentage = Math.round((completed / total) * 100);
  const barLength = 10;
  const filledLength = Math.round((completed / total) * barLength);

  let bar = '[';
  for (let i = 0; i < barLength; i++) {
    if (i < filledLength) {
      bar += '=';
    } else if (i === filledLength) {
      bar += '>';
    } else {
      bar += '-';
    }
  }
  bar += `] ${percentage}% (${completed}/${total})`;

  return bar;
}

// function generateProgressBar(currentLesson: number, total: number): string {
//   const completed = currentLesson - 1;
//   const percentage = Math.round((completed / total) * 100);
//   const barLength = 10;
//   const filledLength = Math.round((completed / total) * barLength);
//
//   let bar = '';
//   for (let i = 0; i < barLength; i++) {
//     if (i < filledLength) {
//       bar += '█';
//     } else if (i === filledLength && completed < total) {
//       bar += '▓';
//     } else {
//       bar += '░';
//     }
//   }
//   bar += ` 📍 ${percentage}%`;
//
//   return bar;
// }
