import { SummaryDetails } from '@core/mongo/educator-mongo';

export function getSummaryMessage(summaryDetails: SummaryDetails): string {
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
