import { SummaryDetails } from '../types';

export function generateSummaryMessage(summaryDetails: SummaryDetails) {
  return [
    `📚 A reminder for the course you learned a few days ago:`,
    ``,
    `🎯 **${summaryDetails.topicTitle}**`,
    ``,
    `📝 **Summary:**`,
    summaryDetails.summary,
    ``,
    `🔑 **Key Takeaways:**`,
    ...summaryDetails.keyTakeaways.map((takeaway, index) => `${index + 1}. ${takeaway}`),
  ].join('\n');
}
