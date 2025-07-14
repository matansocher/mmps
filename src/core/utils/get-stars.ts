export function getStars(amount: number, total: number = 5): string {
  const stars = '★'.repeat(amount);
  const emptyStars = '☆'.repeat(total - amount);
  return `${stars}${emptyStars}`;
}
