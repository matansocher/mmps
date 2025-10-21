import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

const logger = new Logger('SportsCalendarScheduler');

const getDaysToAdd = (dayOfWeek: number): number => {
  if (dayOfWeek === 0) {
    return 2; // Sunday to Tuesday
  } else if (dayOfWeek === 3) {
    return 3; // Wednesday to Saturday
  }
  return 2; // Fallback
};

const handleDates = (): { dayOfWeek: number; startDate: string; endDate: string } => {
  const today = new Date();
  const dayOfWeek = today.getDay();

  const startDate = getDateString();
  const daysToAdd = getDaysToAdd(dayOfWeek);

  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() + daysToAdd);
  const endDate = endDateObj.toISOString().split('T')[0];

  return { dayOfWeek, startDate, endDate };
};

export async function sportsCalendar(bot: TelegramBot, chatbotService: ChatbotService): Promise<void> {
  try {
    const { dayOfWeek, startDate, endDate } = handleDates();
    const dateRangeLabel = dayOfWeek === 0 ? 'the next 3 days (Sunday-Tuesday)' : 'the next 4 days (Wednesday-Saturday)';

    const prompt = `Check football matches from ${startDate} to ${endDate} (${dateRangeLabel}) and add very important ones to my calendar.

1. Use the top_matches_for_prediction tool to get ALL upcoming matches for this period. Pass both date="${startDate}" and endDate="${endDate}" parameters.

2. Analyze ALL matches in this period and identify the MOST IMPORTANT ones based on:
   - League prestige: Champions League > Israeli premier league > Premier League/La Liga/Bundesliga/Serie A > Other top leagues
   - Team quality: Matches involving top teams (position 1-4 in their league)
   - Title races: Top teams within 5 points of each other
   - Relegation battles: Bottom 4 teams playing against each other
   - Table proximity: Teams within 3 positions of each other with less than 6 points difference
   - Derby significance: Teams very close in the table (within 2 positions)

3. Select ONLY the truly important matches (typically 1-3 matches per day for this period, could be less if no important matches).
   A match should be considered "very important" if it meets at least 2 of the above criteria.

4. For each important match, use the calendar tool to create an event:
   - title: "⚽ [Home Team] vs [Away Team]" (in English)
   - description: Include league name and why it's important (1 sentence)
   - startDateTime and endDateTime: Use the match's actual start time, add 2 hours for end time
   - location: The venue from the match data

5. After creating calendar events, send me a summary message in Hebrew:
   - If events were created: "✅ הוספתי [X] משחקים חשובים ללוח השנה:" followed by the list grouped by day
   - If no important matches: "אין משחקים חשובים במיוחד בתקופה הקרובה 🤷‍♂️"

Keep the message concise and in Hebrew.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to add important games to calendar: ${err}`);
  }
}
