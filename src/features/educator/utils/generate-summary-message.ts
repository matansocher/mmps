import { SummaryDetails } from '../types';

export function generateSummaryMessage(summaryDetails: SummaryDetails): string {
  return [
    `📚 תזכורת לנושא שלמדת לפני כמה ימים:`,
    ``,
    `🎯 **${summaryDetails.topicTitle}**`,
    ``,
    `📝 **סיכום:**`,
    summaryDetails.summary,
    ``,
    `🔑 **נקודות מפתח לזכור:**`,
    ...summaryDetails.keyTakeaways.map((takeaway, index) => `${index + 1}. ${takeaway}`),
  ].join('\n');
}
