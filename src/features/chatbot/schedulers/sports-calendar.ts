import type TelegramBot from 'node-telegram-bot-api';
import { Logger } from '@nestjs/common';
import { MY_USER_ID } from '@core/config';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

export const LIKED_TEAMS: string[] = ['Real Madrid', 'Barcelona', 'Arsenal FC', 'Liverpool FC', 'Manchester United FC', 'Manchester City FC', 'Maccabi Haifa'];

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

    // Merge favorite teams and liked teams (removing duplicates)
    const allTeams = Array.from(new Set(LIKED_TEAMS));
    const likedTeamsInfo = LIKED_TEAMS.length > 0 ? `\n   - **IMPORTANT**: My personal liked teams (${LIKED_TEAMS.join(', ')}) - ALL their matches must be added regardless of other criteria` : '';

    const prompt = `Check football matches from ${startDate} to ${endDate} (${dateRangeLabel}) and add ONLY the most important ones to my calendar.

**STRICT FILTERING CRITERIA - Be VERY selective:**

1. Use the top_matches_for_prediction tool to get ALL upcoming matches for this period. Pass both date="${startDate}" and endDate="${endDate}" parameters.

2. **My Favorite Teams**: ${allTeams.join(', ')}

3. **Match Selection Rules** - A match is considered VERY IMPORTANT only if it meets at least 3 of these criteria:

   **HIGH PRIORITY CRITERIA:**
   - ⭐ **Favorite Team Match**: Any match involving one of my favorite teams (${allTeams.join(', ')}) in a meaningful competition (league/champions league knockout, NOT early cup rounds or friendlies)${likedTeamsInfo}

   - 🏆 **Champions League Knockout**: ONLY Round of 16, Quarter-finals, Semi-finals, or Final (NO group stage matches unless involving favorite team)

   - 🇮🇱 **Israeli Premier League Derby**: True historic derbies (e.g., Tel Aviv derby, Haifa derby, Beer Sheva vs Maccabi Tel Aviv)

   - 🥇 **Title Decider**: Top 2 teams, within 3 points, playing each other in the final 5 rounds

   - ⚽ **Israeli Premier League Top Match**: Top 4 teams playing each other

   **MEDIUM PRIORITY CRITERIA:**
   - 🔴 **Relegation Six-Pointer**: Bottom 3 teams playing each other in the final 5 rounds

   - 📊 **Israeli Premier League: Top team vs contender**: Team in position 1-2 playing team in position 3-5

4. **TARGET**: Add 1-2 matches total for this period (NOT per day). Only exceed this if there are multiple exceptional matches (e.g., multiple CL knockout games).

5. **EXPLICIT EXCLUSIONS - Do NOT add:**
   - Champions League group stage matches (unless involving favorite team)
   - Regular league matches between mid-table teams
   - Matches between teams with >8 points difference
   - Early round cup matches
   - Friendlies
   - Matches from leagues outside the priority list
   - "Interesting" matches that don't meet 3+ criteria

6. For each selected match, use the calendar tool to create an event:
   - title: "⚽ [Home Team] vs [Away Team]" (in English)
   - description: Include league name and specific reason why it's important (1 sentence)
   - startDateTime and endDateTime: Use the match's actual start time, add 2 hours for end time
   - location: The venue from the match data

7. After creating calendar events, send me a summary message in Hebrew:
   - If events were created: "✅ הוספתי [X] משחקים חשובים ללוח השנה:" followed by the list grouped by day with brief explanation why each is important
   - If no important matches: "אין משחקים חשובים במיוחד בתקופה הקרובה 🤷‍♂️"

**Remember**: Quality over quantity. It's better to add zero matches than to add matches that aren't truly important.

Keep the message concise and in Hebrew.`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to add important games to calendar: ${err}`);
  }
}
