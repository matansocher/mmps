export const BROKEN_RECORD_IMAGE_PROMPT = [
  `A highly energetic and inspiring digital artwork celebrating a fitness streak record.`,
  `A glowing number representing the new streak record (e.g., '{streak} Days!') stands bold at the center, surrounded by dynamic light rays and a powerful aura.`,
  `In the background, a silhouette of a determined athlete (or a character resembling the user’s journey) is in a victorious pose, standing on top of a mountain, in a gym, or mid-workout, symbolizing their dedication.`,
  `The scene is vibrant, colorful, and motivational, evoking a sense of achievement and relentless perseverance.`,
  `The image should feel epic, cinematic, and triumphant, with sparks, glowing embers, or energy waves surrounding the main elements.`,
].join(' ');

export function getLastWeekDates(): { lastSunday: Date; lastSaturday: Date } {
  const now = new Date();
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - now.getDay());
  lastSunday.setHours(0, 0, 0, 0);

  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  lastSaturday.setHours(23, 59, 59, 999);

  return { lastSunday, lastSaturday };
}
