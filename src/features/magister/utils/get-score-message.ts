export function getScoreMessage(correctAnswers: number, totalQuestions: number): string {
  const percentage = (correctAnswers / totalQuestions) * 100;

  let encouragement: string;
  if (percentage === 100) {
    encouragement = 'Outstanding! 🎉🏆 Perfect score!';
  } else if (percentage >= 80) {
    encouragement = 'Excellent! 👏 You really know your stuff!';
  } else if (percentage >= 60) {
    encouragement = 'Good job! 👍 Solid understanding!';
  } else if (percentage >= 40) {
    encouragement = 'Not bad! 📚 Review the material to strengthen your knowledge.';
  } else {
    encouragement = 'Consider reviewing the course material 📚 to reinforce your learning.';
  }

  return [`🎯 *Quiz Complete!*`, '', `*Your Score: ${correctAnswers}/${totalQuestions}*`, '', encouragement].join('\n');
}
