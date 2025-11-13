export function getAlertEmoji(alert: string): string {
  const emojis: Record<string, string> = {
    green: '🟢',
    yellow: '🟡',
    orange: '🟠',
    red: '🔴',
  };
  return emojis[alert] || '⚪';
}
