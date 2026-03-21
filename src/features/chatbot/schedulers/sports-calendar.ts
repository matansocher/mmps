import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { Logger } from '@core/utils';
import { getDateString } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import type { ChatbotService } from '../chatbot.service';

export const LIKED_TEAMS: string[] = ['Real Madrid', 'Barcelona', 'Arsenal FC', 'Liverpool FC', 'Manchester United FC', 'Manchester City FC', 'Chelsea FC', 'Bayern Munich', 'Maccabi Haifa'];

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

export async function sportsCalendar(bot: Bot, chatbotService: ChatbotService): Promise<void> {
  try {
    const { dayOfWeek, startDate, endDate } = handleDates();
    const dateRangeLabel = dayOfWeek === 0 ? 'the next 3 days (Sunday-Tuesday)' : 'the next 4 days (Wednesday-Saturday)';

    const favoriteTeams = Array.from(new Set(LIKED_TEAMS));

    const prompt = `Check football matches from ${startDate} to ${endDate} (${dateRangeLabel}) and add the relevant ones to my calendar.

1. Use the top_matches_for_prediction tool to get ALL upcoming matches for this period. Pass both date="${startDate}" and endDate="${endDate}" parameters.

2. **My Favorite Teams**: ${favoriteTeams.join(', ')}

3. **Match Selection Rules** - Two categories of matches to add:

   **CATEGORY A - Favorite Team Matches (ALWAYS add, no exceptions):**
   - ⭐ Add ALL matches involving any of my favorite teams: ${favoriteTeams.join(', ')}
   - Include ALL competition types: league matches, cup matches, Champions League (any round), Europa League, etc.
   - Do NOT skip any favorite team match - add every single one within the timeframe

   **CATEGORY B - Other Important Matches (add only if truly exceptional):**
   - 🏆 **Champions League Knockout**: Round of 16, Quarter-finals, Semi-finals, or Final (NOT group stage)
   - 🇮🇱 **Israeli Premier League Derby**: True historic derbies (e.g., Tel Aviv derby, Haifa derby)
   - 🥇 **Title Decider**: Top 2 teams, within 3 points, playing each other in the final 5 rounds
   - ⚽ **Israeli Premier League Top Match**: Top 4 teams playing each other

4. **EXPLICIT EXCLUSIONS for Category B only** - Do NOT add:
   - Champions League group stage matches
   - Regular league matches between mid-table teams
   - Matches between teams with >8 points difference
   - Early round cup matches
   - Friendlies

5. For each selected match, use the calendar tool to create an event:
   - title: "⚽ [Home Team] vs [Away Team]" (in English)
   - description: Include league name and specific reason why it's important (1 sentence)
   - startDateTime and endDateTime: Use the match's actual start time, add 2 hours for end time
   - location: The venue from the match data

6. After creating calendar events, send me a summary message in English:
   - If events were created: "✅ Added [X] matches to the calendar:" followed by the list grouped by day with brief explanation why each was added
   - If no matches found: "No matches coming up for my favorite teams or other important fixtures 🤷‍♂️"`;

    const response = await chatbotService.processMessage(prompt, MY_USER_ID);

    if (response?.message) {
      await sendShortenedMessage(bot, MY_USER_ID, response.message, { parse_mode: 'Markdown' });
    }
  } catch (err) {
    logger.error(`Failed to add important games to calendar: ${err}`);
  }
}
