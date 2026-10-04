import { addHours } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { DEFAULT_TIMEZONE, MY_USER_NAME } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { hasHebrew } from '@core/utils';
import { notify } from '@services/notifier';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, MessageLoader, UserDetails } from '@services/telegram';
import { addSubscription, archiveSubscription, getActiveSubscriptions, getSubscriptionById, saveUserDetails, Subscription, WoltRestaurant } from '@shared/wolt';
import { restaurantsService } from './restaurants.service';
import { getSearchResults, saveSearchResults } from './search-results.store';
import { getRestaurantsByName, rankRestaurantsByRelevance } from './utils';
import {
  ANALYTIC_EVENT_NAMES,
  BOT_ACTIONS,
  BOT_CONFIG,
  INLINE_KEYBOARD_SEPARATOR,
  MAX_NUM_OF_RESTAURANTS_TO_SHOW,
  MAX_NUM_OF_SUBSCRIPTIONS_PER_USER,
  SUBSCRIPTION_EXPIRATION_HOURS,
  SUBSCRIPTION_EXTENSION_HOURS,
} from './wolt.config';

export class WoltController {
  private readonly logger = new Logger('wolt:controller');

  constructor(private readonly bot: Bot) {}

  init(): void {
    const { START, LIST, CONTACT } = BOT_CONFIG.commands;
    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(LIST.command.replace('/', ''), (ctx) => this.listHandler(ctx));
    this.bot.command(CONTACT.command.replace('/', ''), (ctx) => this.contactHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.catch((err) => this.logger.error(`${getErrorMessage(err)}`));
  }

  async startHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    const saveResult = await saveUserDetails(userDetails);

    const newUserReplyText = [
      `שלום {firstName}!`,
      `אני בוט שמתריע על מסעדות שנפתחות להזמנה בוולט`,
      `פשוט תשלחו לי את שם המסעדה (באנגלית 🇺🇸), ואני אגיד לכם מתי היא נפתחת`,
      `כדי לראות את רשימת ההתראות הפתוחות אפשר להשתמש בפקודה /list`,
    ]
      .join('\n')
      .replace('{firstName}', userDetails.firstName || userDetails.username || '');
    const existingUserReplyText = `מעולה, הכל מוכן ואפשר להתחיל לחפש 🍔🍕🍟`;
    await ctx.reply(saveResult === 'updated' ? existingUserReplyText : newUserReplyText);

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START, isNewUser: saveResult === 'created' }, userDetails);
  }

  async contactHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);

    await ctx.reply([`בשמחה, אפשר לדבר עם מי שיצר אותי, הוא בטח יוכל לעזור 📬`, MY_USER_NAME].join('\n'));
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
  }

  async listHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);

    try {
      const subscriptions = await getActiveSubscriptions(chatId);
      if (!subscriptions.length) {
        const replyText = `אין לך התראות פתוחות`;
        await ctx.reply(replyText);
        return;
      }

      const promisesArr = subscriptions.map((subscription: Subscription) => {
        const keyboard = buildInlineKeyboard([
          {
            text: '⛔️ הסרה ⛔️',
            data: [BOT_ACTIONS.REMOVE, String(subscription._id)].join(INLINE_KEYBOARD_SEPARATOR),
            style: 'danger',
          },
        ]);
        const subscriptionTime = formatInTimeZone(subscription.createdAt, DEFAULT_TIMEZONE, 'HH:mm');
        const expiryTime = formatInTimeZone(subscription.expiresAt ?? addHours(subscription.createdAt, SUBSCRIPTION_EXPIRATION_HOURS), DEFAULT_TIMEZONE, 'HH:mm');
        const replyText = [`${subscriptionTime} - ${subscription.restaurant}`, `⏳ ההתראה פעילה עד ${expiryTime}`].join('\n');
        return ctx.reply(replyText, { reply_markup: keyboard });
      });
      await Promise.all(promisesArr);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LIST }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, error: `error - ${err}`, method: this.listHandler.name }, userDetails);
      await ctx.reply(RETRY_LATER_MESSAGE).catch(() => {});
      throw err;
    }
  }

  async textHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, userDetails, text: rawRestaurant } = getMessageData(ctx);
    const restaurant = rawRestaurant.toLowerCase().trim();

    try {
      if (hasHebrew(restaurant)) {
        await ctx.reply('אני מדבר עברית שוטף, אבל אני יכול לחפש מסעדות רק באנגלית 🇺🇸');
        return;
      }

      // The first search after the cache expires triggers a full multi-city refresh that can take a few
      // seconds. Show a reaction + typing action immediately, and a loader message if it runs long, so the
      // user knows the bot is working rather than assuming it errored.
      const loader = new MessageLoader(this.bot, chatId, messageId, {
        reactionEmoji: '👀',
        loaderMessage: 'מחפש את המסעדות הכי טובות בשבילך 🍔',
        loadingAction: 'typing',
      });
      // MessageLoader swallows errors thrown inside the action, so capture and re-throw to keep the existing
      // error analytics working.
      let searchError: unknown;
      await loader.handleMessageWithLoader(async () => {
        try {
          await this.searchRestaurants(ctx, userDetails, restaurant, rawRestaurant);
        } catch (err) {
          searchError = err;
        }
      });
      if (searchError) {
        throw searchError;
      }
    } catch (err) {
      notify(BOT_CONFIG, { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: `${err}`, method: this.textHandler.name }, userDetails);
      throw err;
    }
  }

  private async searchRestaurants(ctx: Context, userDetails: UserDetails, restaurant: string, rawRestaurant: string): Promise<void> {
    const restaurants = await restaurantsService.getRestaurants({ allowStale: true });
    let matchedRestaurants = getRestaurantsByName(restaurants, restaurant);
    if (!matchedRestaurants.length) {
      const replyText = ['לא מצאתי אף מסעדה שמתאימה לחיפוש:', restaurant, '', 'כדאי לבדוק את האיות, או לנסות חלק משם המסעדה.', 'אפשר גם להדביק כאן לינק למסעדה מאפליקציית וולט ואני אמצא אותה.'].join(
        '\n',
      );
      await ctx.reply(replyText);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, restaurants: 'No matched restaurants' }, userDetails);
      return;
    }

    if (matchedRestaurants.length > MAX_NUM_OF_RESTAURANTS_TO_SHOW) {
      await ctx.replyWithChatAction('typing');
      matchedRestaurants = await rankRestaurantsByRelevance(matchedRestaurants, restaurant);
    }
    matchedRestaurants = uniqueById(matchedRestaurants);

    const searchId = saveSearchResults(matchedRestaurants.map((r) => r.id));
    const keyboard = buildResultsPageKeyboard(matchedRestaurants, searchId, 1);
    const replyText = `אפשר לבחור את אחת מהמסעדות האלה, ואני אתריע כשהיא נפתחת`;
    await ctx.reply(replyText, { reply_markup: keyboard });
    const shownNames = matchedRestaurants.slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW).map((r) => r.name);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, matches: matchedRestaurants.length, restaurants: shownNames.join(' | ') }, userDetails);
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails, data } = getCallbackQueryData(ctx);

    const [action, ...values] = data.split(INLINE_KEYBOARD_SEPARATOR);
    // buttons sent before ids were used carry the restaurant name, which may itself contain the separator
    const value = values.join(INLINE_KEYBOARD_SEPARATOR);
    try {
      switch (action) {
        case BOT_ACTIONS.REMOVE: {
          await ctx.answerCallbackQuery().catch(() => {});
          await this.removeSubscription(ctx, chatId, userDetails, value, await getActiveSubscriptions(chatId));
          break;
        }
        case BOT_ACTIONS.ADD: {
          await ctx.answerCallbackQuery().catch(() => {});
          await this.addSubscription(ctx, chatId, userDetails, value, await getActiveSubscriptions(chatId));
          break;
        }
        case BOT_ACTIONS.EXTEND: {
          await ctx.answerCallbackQuery().catch(() => {});
          const [subscriptionId, hours] = values;
          await this.extendSubscription(ctx, chatId, userDetails, subscriptionId, parseInt(hours, 10));
          break;
        }
        case BOT_ACTIONS.CHANGE_PAGE: {
          const [searchId, page] = values;
          const pageNumber = parseInt(page, 10);
          if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            await ctx.answerCallbackQuery({ text: 'לא הבנתי את הבקשה שלך 😕' });
            break;
          }
          await this.changePage(ctx, userDetails, searchId, pageNumber);
          break;
        }
        default: {
          await ctx.answerCallbackQuery({ text: 'לא הבנתי את הבקשה שלך 😕' });
          await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
          break;
        }
      }
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, what: action, error: `${err}`, method: this.callbackQueryHandler.name }, userDetails);
      // the buttons are kept so the user can tap again
      await ctx.reply(RETRY_LATER_MESSAGE).catch(() => {});
      throw err;
    }
  }

  // restaurantKey is the venue id, or the restaurant name on buttons sent before ids were used
  // returns whether a subscription was created
  async addSubscription(ctx: Context, chatId: number, userDetails: UserDetails, restaurantKey: string, activeSubscriptions: Subscription[], extensionHours?: number): Promise<boolean> {
    const restaurants = await restaurantsService.getRestaurants();
    const restaurantDetails = restaurants.find((r) => r.id === restaurantKey) ?? restaurants.find((r) => r.name === restaurantKey);
    if (!restaurantDetails) {
      await ctx.reply('אני מצטער אבל לא הצלחתי למצוא את המסעדה הזאת');
      return false;
    }
    const restaurant = restaurantDetails.name;

    const alreadySubscribedText = ['הכל טוב, כבר יש לך התראה על המסעדה:', restaurant].join('\n');
    // records from before venue ids were stored only have the name
    const existingSubscription = activeSubscriptions.find((s) => (s.restaurantId ? s.restaurantId === restaurantDetails.id : s.restaurant === restaurant));
    if (existingSubscription) {
      await ctx.reply(alreadySubscribedText);
      return false;
    }

    if (activeSubscriptions?.length >= MAX_NUM_OF_SUBSCRIPTIONS_PER_USER) {
      await ctx.reply(['אני מצטער, אבל יש כבר יותר מדי התראות פתוחות', `יש לי הגבלה של עד ${MAX_NUM_OF_SUBSCRIPTIONS_PER_USER} התראות למשתמש 😥`].join('\n'));
      return false;
    }

    if (restaurantDetails.isOnline) {
      const replyText = [`נראה שהמסעדה פתוחה ממש עכשיו 🟢`, `אפשר להזמין ממנה עכשיו! 🍴`].join('\n');
      const keyboard = new InlineKeyboard().url(restaurantDetails.name, restaurantDetails.link).success();
      await ctx.reply(replyText, { reply_markup: keyboard });
      return false;
    }

    const expiresAt = addHours(new Date(), extensionHours ?? SUBSCRIPTION_EXPIRATION_HOURS);
    const replyText = extensionHours
      ? [`סגור, הארכתי את ההתראה עד ${formatInTimeZone(expiresAt, DEFAULT_TIMEZONE, 'HH:mm')} ⏳`, restaurant].join('\n')
      : ['סגור, אני אתריע ברגע שאני אראה שהמסעדה נפתחת 🚨', restaurant].join('\n');
    const insertResult = await addSubscription(chatId, restaurant, restaurantDetails.photo, restaurantDetails.id, expiresAt);
    if (!insertResult) {
      // a concurrent tap created it first
      await ctx.reply(alreadySubscribedText);
      return false;
    }
    await ctx.reply(replyText);
    await ctx.react('🤝').catch(() => {});

    const action = extensionHours ? ANALYTIC_EVENT_NAMES.EXTEND : ANALYTIC_EVENT_NAMES.SUBSCRIBE;
    notify(BOT_CONFIG, { action, restaurant, ...(extensionHours ? { hours: extensionHours } : {}) }, userDetails);
    return true;
  }

  // renews an expired subscription from the buttons on the expiry message
  async extendSubscription(ctx: Context, chatId: number, userDetails: UserDetails, subscriptionId: string, hours: number): Promise<void> {
    const subscription = SUBSCRIPTION_EXTENSION_HOURS.includes(hours) ? await getSubscriptionById(subscriptionId) : null;
    if (!subscription || subscription.chatId !== chatId) {
      await ctx.reply('לא הצלחתי להאריך את ההתראה הזאת, אפשר לחפש את המסעדה שוב 🔍');
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      return;
    }

    const isExtended = await this.addSubscription(ctx, chatId, userDetails, subscription.restaurantId ?? subscription.restaurant, await getActiveSubscriptions(chatId), hours);
    if (isExtended) {
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    }
  }

  // subscriptionKey is the subscription id, or the restaurant name on buttons sent before ids were used
  async removeSubscription(ctx: Context, chatId: number, userDetails: UserDetails, subscriptionKey: string, activeSubscriptions: Subscription[]): Promise<void> {
    const existingSubscription = activeSubscriptions.find((s) => s._id?.toString() === subscriptionKey || s.restaurant === subscriptionKey);
    const restaurant = existingSubscription?.restaurant ?? (OBJECT_ID_REGEX.test(subscriptionKey) ? '' : subscriptionKey);
    if (existingSubscription) {
      await archiveSubscription(existingSubscription._id, false);
      await ctx.reply([`סבבה, הורדתי את ההתראה ל:`, restaurant].join('\n'));
    } else {
      await ctx.reply(restaurant ? [`🤔 הכל טוב, כבר אין לך התראה פתוחה על:`, restaurant].join('\n') : '🤔 הכל טוב, ההתראה הזאת כבר לא פתוחה');
    }
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.react('👌').catch(() => {});

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, restaurant }, userDetails);
  }

  async changePage(ctx: Context, userDetails: UserDetails, searchId: string, page: number): Promise<void> {
    const restaurantIds = getSearchResults(searchId);
    if (!restaurantIds) {
      await ctx.answerCallbackQuery({ text: 'החיפוש הזה כבר לא בתוקף, אפשר לחפש שוב 🔍' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
      return;
    }
    await ctx.answerCallbackQuery().catch(() => {});

    const restaurants = await restaurantsService.getRestaurants({ allowStale: true });
    const restaurantsById = new Map(restaurants.map((r) => [r.id, r]));
    const matchedRestaurants = restaurantIds.map((id) => restaurantsById.get(id)).filter(Boolean);
    const keyboard = buildResultsPageKeyboard(matchedRestaurants, searchId, page);

    // the results message may have been deleted by the user while the bot was busy
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch((err) => this.logger.warn(`Failed to change page: ${getErrorMessage(err)}`));

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHANGE_PAGE, page }, userDetails);
  }
}

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const RETRY_LATER_MESSAGE = 'משהו השתבש אצלי, אפשר לנסות שוב בעוד רגע 🙏';

function uniqueById(restaurants: WoltRestaurant[]): WoltRestaurant[] {
  const seen = new Set<string>();
  return restaurants.filter((r) => !seen.has(r.id) && seen.add(r.id));
}

function buildResultsPageKeyboard(restaurants: WoltRestaurant[], searchId: string, page: number): InlineKeyboard {
  const from = MAX_NUM_OF_RESTAURANTS_TO_SHOW * (page - 1);
  const to = from + MAX_NUM_OF_RESTAURANTS_TO_SHOW;

  const keyboard = new InlineKeyboard();
  for (const r of restaurants.slice(from, to)) {
    // the id, not the name: names can contain the separator and long ones overflow Telegram's 64-byte callback data
    keyboard.text(`${r.name} - ${r.isOnline ? '🟢 זמין 🟢' : '🛑 לא זמין 🛑'}`, [BOT_ACTIONS.ADD, r.id].join(INLINE_KEYBOARD_SEPARATOR));
    if (r.isOnline) {
      keyboard.success();
    } else {
      keyboard.danger();
    }
    keyboard.row();
  }

  if (page > 1) {
    keyboard.text(['⬅️', `(${page - 1})`, 'דף הקודם'].join(' '), [BOT_ACTIONS.CHANGE_PAGE, searchId, page - 1].join(INLINE_KEYBOARD_SEPARATOR));
  }
  if (to < restaurants.length) {
    keyboard.text(['➡️', `(${page + 1})`, 'דף הבא'].join(' '), [BOT_ACTIONS.CHANGE_PAGE, searchId, page + 1].join(INLINE_KEYBOARD_SEPARATOR));
  }
  return keyboard;
}
