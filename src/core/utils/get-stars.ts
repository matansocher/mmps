export function getStars(amount: number, max: number = 5): string {
  if (amount >= max) {
    return '★'.repeat(max);
  }
  const stars = '★'.repeat(amount);
  const emptyStars = '☆'.repeat(max - amount);
  return `${stars}${emptyStars}`;
}
