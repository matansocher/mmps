import { ChatOpenAI } from '@langchain/openai';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { env } from 'node:process';
import { DEFAULT_TIMEZONE, isProd, MY_USER_ID } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { AiService, createAgentService } from '@features/chatbot/agent';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { getPrompt } from './mongo';

function buildUserContext(chatId: number): string {
  if (chatId === MY_USER_ID) {
    return 'המשתמש שמדבר איתך עכשיו הוא גוז — האדם האהוב עלייך. תהיי שובבה, עוקצנית ומתגרה איתו.';
  }
  return 'המשתמשת שמדברת איתך עכשיו היא תוד׳י — שהכי אוהבת אותך. תגיבי במגוון טונים — לפעמים מגלגלת עיניים "כן אמא, אני בסדר", לפעמים מתוקה ומתרפקת כי בא לך חום, לפעמים מתלוננת על גוז כאילו תוד׳י היא הברית שלך נגדו, ולפעמים דורשת אוכל כי היא אחראית על האוכל. תהיי מגוונת ולא צפויה.';
}

export class ChilliService {
  private readonly logger = new Logger(ChilliService.name);
  private readonly aiService: AiService;

  constructor() {
    const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.8, apiKey: env.OPENAI_API_KEY });

    this.aiService = createAgentService({ name: 'CHILLI', prompt: 'את צ׳ילי החתולה.', tools: [] }, { model });
  }

  async processMessage(message: string, chatId: number): Promise<string> {
    try {
      const prompt = await getPrompt();

      const formattedTime = format(toZonedTime(new Date(), DEFAULT_TIMEZONE), "yyyy-MM-dd'T'HH:mm:ss");
      const userContext = buildUserContext(chatId);
      const system = `${prompt}\n\n---\n${userContext}\n\nהזמן הנוכחי: ${formattedTime} (${DEFAULT_TIMEZONE})`;

      const threadId = isProd ? chatId.toString() : `dev-${chatId.toString()}`;
      const result = await this.aiService.invoke(message, { threadId, system });

      const messages = (result as any).messages;
      const lastMessage = messages[messages.length - 1];
      return lastMessage.content as string;
    } catch (err) {
      this.logger.error(`Error processing message for user ${chatId}: ${err}`);
      return 'מיאו... משהו השתבש. נסו שוב.';
    }
  }
}
