export function getScoreMessage(correctAnswers: number, totalQuestions: number): string {
  const percentage = (correctAnswers / totalQuestions) * 100;

  let encouragement: string;
  if (percentage === 100) {
    encouragement = 'מדהים! 🎉🏆 ציון מושלם!';
  } else if (percentage >= 66) {
    encouragement = 'מעולה! 👏💪 אתה באמת שולט בחומר!';
  } else if (percentage >= 33) {
    encouragement = 'לא רע! 👍 עוד קצת תרגול ותהיה מושלם!';
  } else {
    encouragement = 'כדאי לחזור על החומר 📚 אבל זה בסדר, ככה לומדים!';
  }

  return [`🎯 הבחן הסתיים!`, '', `הציון שלך: ${correctAnswers}/${totalQuestions}`, '', encouragement].join('\n');
}
