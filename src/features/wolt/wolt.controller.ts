import type { Bot, Context } from 'grammy';
import { InlineKeyboard } from 'grammy';
import { MY_USER_NAME } from '@core/config';
import { Logger } from '@core/utils';
import { getDateNumber, hasHebrew } from '@core/utils';
import { notify } from '@services/notifier';
import { buildInlineKeyboard, getCallbackQueryData, getMessageData, UserDetails } from '@services/telegram';
import { addSubscription, archiveSubscription, getActiveSubscriptions, saveUserDetails, Subscription, WoltRestaurant } from '@shared/wolt';
import { restaurantsService } from './restaurants.service';
import { getRestaurantsByName, rankRestaurantsByRelevance } from './utils';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG, INLINE_KEYBOARD_SEPARATOR, MAX_NUM_OF_RESTAURANTS_TO_SHOW, MAX_NUM_OF_SUBSCRIPTIONS_PER_USER, SUBSCRIPTION_EXPIRATION_HOURS } from './wolt.config';

export class WoltController {
  private readonly logger = new Logger(WoltController.name);

  constructor(private readonly bot: Bot) {}

  init(): void {
    const { START, LIST, CONTACT } = BOT_CONFIG.commands;
    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(LIST.command.replace('/', ''), (ctx) => this.listHandler(ctx));
    this.bot.command(CONTACT.command.replace('/', ''), (ctx) => this.contactHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.bot.catch((err) => this.logger.error(`${err}`));
  }

  async startHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    const userExists = await saveUserDetails(userDetails);

    const newUserReplyText = [
      `שלום {firstName}!`,
      `אני בוט שמתריע על מסעדות שנפתחות להזמנה בוולט`,
      `פשוט תשלחו לי את שם המסעדה (באנגלית 🇺🇸), ואני אגיד לכם מתי היא נפתחת`,
      `כדי לראות את רשימת ההתראות הפתוחות אפשר להשתמש בפקודה /list`,
    ]
      .join('\n')
      .replace('{firstName}', userDetails.firstName || userDetails.username || '');
    const existingUserReplyText = `מעולה, הכל מוכן ואפשר להתחיל לחפש 🍔🍕🍟`;
    await ctx.reply(userExists ? existingUserReplyText : newUserReplyText);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START, isNewUser: !userExists }, userDetails);
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

      const promisesArr = subscriptions.map(async (subscription: Subscription) => {
        // fetch fresh state from DB to ensure isPermanent is up-to-date
        const latest = await (await import('@shared/wolt')).getSubscription(chatId, subscription.restaurant);
        const isPermanent = Boolean((latest as any)?.isPermanent);

        const buttons: { text: string; data: string; style?: 'danger' | 'success' | 'primary' }[] = [
          {
            text: '⛔️ הסרה ⛔️',
            data: [BOT_ACTIONS.REMOVE, subscription.restaurant].join(INLINE_KEYBOARD_SEPARATOR),
            style: 'danger',
          },
        ];
        if (isPermanent) {
          buttons.push({
            text: '🔁 הפוך לזמנית',
            data: [BOT_ACTIONS.MAKE_TEMP, subscription.restaurant].join(INLINE_KEYBOARD_SEPARATOR),
            style: 'primary',
          });
        } else {
          buttons.push({
            text: '∞ הפוך לקבוע',
            data: [BOT_ACTIONS.MAKE_PERM, subscription.restaurant].join(INLINE_KEYBOARD_SEPARATOR),
            style: 'primary',
          });
        }
        const keyboard = buildInlineKeyboard(buttons);
        const subscriptionTime = `${getDateNumber(subscription.createdAt.getHours())}:${getDateNumber(subscription.createdAt.getMinutes())}`;
        const badge = isPermanent ? ' ∞' : '';
        const expiresText = !isPermanent && (subscription as any)?.createdAt ? ` (expires in ${Math.max(0, Math.round(((new Date((subscription as any).createdAt).getTime() + SUBSCRIPTION_EXPIRATION_HOURS * 60 * 60 * 1000) - Date.now()) / (60 * 1000)))}m)` : '';
        return ctx.reply(`${subscriptionTime} - ${subscription.restaurant}${badge}${expiresText}`, { reply_markup: keyboard });
      });
      await Promise.all(promisesArr);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.LIST }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, error: `error - ${err}`, method: this.listHandler.name }, userDetails);
      throw err;
    }
  }

  async textHandler(ctx: Context): Promise<void> {
    const { userDetails, text: rawRestaurant } = getMessageData(ctx);
    const restaurant = rawRestaurant.toLowerCase().trim();

    try {
      if (hasHebrew(restaurant)) {
        await ctx.reply('אני מדבר עברית שוטף, אבל אני יכול לחפש מסעדות רק באנגלית 🇺🇸');
        return;
      }

      const restaurants = await restaurantsService.getRestaurants();
      let matchedRestaurants = getRestaurantsByName(restaurants, restaurant);
      if (!matchedRestaurants.length) {
        const replyText = ['וואלה חיפשתי ולא מצאתי אף מסעדה שמתאימה לחיפוש:', restaurant].join('\n');
        await ctx.reply(replyText);
        notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, restaurants: 'No matched restaurants' }, userDetails);
        return;
      }

      if (matchedRestaurants.length > MAX_NUM_OF_RESTAURANTS_TO_SHOW) {
        await ctx.replyWithChatAction('typing');
        matchedRestaurants = await rankRestaurantsByRelevance(matchedRestaurants, restaurant);
      }

      let buttons: { text: string; data: string; style?: 'danger' | 'success' | 'primary' }[] = matchedRestaurants.map((restaurant) => {
        return {
          text: `${restaurant.name} - ${restaurant.isOnline ? '🟢 זמין 🟢' : '🛑 לא זמין 🛑'}`,
          data: [BOT_ACTIONS.ADD, restaurant.name].join(INLINE_KEYBOARD_SEPARATOR),
          style: (restaurant.isOnline ? 'success' : 'danger') as 'success' | 'danger',
        };
      });

      if (matchedRestaurants.length > MAX_NUM_OF_RESTAURANTS_TO_SHOW) {
        buttons = [...buttons.slice(0, MAX_NUM_OF_RESTAURANTS_TO_SHOW)];
        buttons.push({ text: 'דף הבא (2) ➡️', data: [BOT_ACTIONS.CHANGE_PAGE, restaurant, 2].join(INLINE_KEYBOARD_SEPARATOR) });
      }

      const keyboard = buildInlineKeyboard(buttons);
      const replyText = `אפשר לבחור את אחת מהמסעדות האלה, ואני אתריע כשהיא נפתחת`;
      await ctx.reply(replyText, { reply_markup: keyboard });
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, search: rawRestaurant, restaurants: matchedRestaurants.map((r) => r.name).join(' | ') }, userDetails);
    } catch (err) {
      notify(BOT_CONFIG, { restaurant, action: ANALYTIC_EVENT_NAMES.ERROR, error: `${err}`, method: this.textHandler.name }, userDetails);
      throw err;
    }
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails, data } = getCallbackQueryData(ctx);

    const [action, restaurant, page] = data.split(INLINE_KEYBOARD_SEPARATOR);
    const restaurantName = restaurant.replace(BOT_ACTIONS.REMOVE, '').replace(INLINE_KEYBOARD_SEPARATOR, '');
    const activeSubscriptions = await getActiveSubscriptions(chatId);
    try {
      switch (action) {
        case BOT_ACTIONS.REMOVE: {
          await this.removeSubscription(ctx, chatId, userDetails, restaurantName, activeSubscriptions);
          break;
        }
        case BOT_ACTIONS.ADD: {
          await this.addSubscription(ctx, chatId, userDetails, restaurantName, activeSubscriptions);
          break;
        }
        case BOT_ACTIONS.CHANGE_PAGE: {
          await this.changePage(ctx, userDetails, restaurantName, parseInt(page));
          break;
        }
        default: {
          await ctx.answerCallbackQuery({ text: 'לא הבנתי את הבקשה שלך 😕' });
          await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
          break;
        }
      }
    } catch (err) {
      this.logger.error(`${this.callbackQueryHandler.name} - error - ${err}`);
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, what: action, error: `${err}`, method: this.callbackQueryHandler.name }, userDetails);
      throw err;
    }
  }

  async addSubscription(ctx: Context, chatId: number, userDetails: UserDetails, restaurant: string, activeSubscriptions: Subscription[]): Promise<void> {
    const existingSubscription = activeSubscriptions.find((s) => s.restaurant === restaurant);
    if (existingSubscription) {
      const replyText = ['הכל טוב, כבר יש לך התראה על המסעדה:', restaurant].join('\n');
      await ctx.reply(replyText);
      return;
    }

    if (activeSubscriptions?.length >= MAX_NUM_OF_SUBSCRIPTIONS_PER_USER) {
      await ctx.reply(['אני מצטער, אבל יש כבר יותר מדי התראות פתוחות', 'יש לי הגבלה של עד 3 התראות למשתמש 😥'].join('\n'));
      return;
    }

    const restaurants = await restaurantsService.getRestaurants();
    const restaurantDetails = restaurants.find((r: WoltRestaurant): boolean => r.name === restaurant);
    if (!restaurantDetails) {
      await ctx.reply('אני מצטער אבל לא הצלחתי למצוא את המסעדה הזאת');
      return;
    }
    if (restaurantDetails.isOnline) {
      const replyText = [`נראה שהמסעדה פתוחה ממש עכשיו 🟢`, `אפשר להזמין ממנה עכשיו! 🍴`].join('\n');
      const keyboard = new InlineKeyboard().url(restaurantDetails.name, restaurantDetails.link).success();
      await ctx.reply(replyText, { reply_markup: keyboard });
      return;
    }

    const replyText = ['סגור, נרשמתי להתראה — אני אתריע ברגע שאגלה שהמסעדה נפתחת 🚨', restaurant].join('\n');
    // Create a temporary 4-hour subscription immediately; offer one button to make it permanent
    await addSubscription(chatId, restaurant, restaurantDetails?.photo, false);
    const keyboard = new InlineKeyboard()
      .text('∞ הפוך לקבוע', [BOT_ACTIONS.MAKE_PERM, restaurant].join(INLINE_KEYBOARD_SEPARATOR));

    await ctx.reply(replyText, { reply_markup: keyboard });
    await ctx.react('🤝').catch(() => {});

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, restaurant }, userDetails);
  }

  async removeSubscription(ctx: Context, chatId: number, userDetails: UserDetails, restaurant: string, activeSubscriptions: Subscription[]): Promise<void> {
    const existingSubscription = activeSubscriptions.find((s) => s.restaurant === restaurant);
    if (existingSubscription) {
      await archiveSubscription(chatId, restaurant, false);
      await ctx.reply([`סבבה, הורדתי את ההתראה ל:`, restaurant].join('\n'));
    } else {
      await ctx.reply([`🤔 הכל טוב, כבר אין לך התראה פתוחה על:`, restaurant].join('\n'));
    }
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.react('👌').catch(() => {});

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.UNSUBSCRIBE, restaurant }, userDetails);
  }

  async handleConfirm(ctx: Context, chatId: number, userDetails: UserDetails, restaurant: string, isPermanent: boolean): Promise<void> {
    const restaurants = await restaurantsService.getRestaurants();
    const restaurantDetails = restaurants.find((r: WoltRestaurant) => r.name === restaurant);
    try {
      await addSubscription(chatId, restaurant, restaurantDetails?.photo || '', isPermanent);
      await ctx.answerCallbackQuery({ text: isPermanent ? 'התראה קבועה נוצרה' : 'התראה ל-4 שעות נוצרה' });
      await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});

      if (isPermanent && restaurantDetails?.isOnline) {
        const replyText = ['נראה שהמסעדה פתוחה ממש עכשיו 🟢', 'אפשר להזמין ממנה עכשיו! 🍴', restaurant].join('\n');
        const keyboard = new InlineKeyboard().url(restaurantDetails.name, restaurantDetails.link);
        await ctx.reply(replyText, { reply_markup: keyboard });
        try {
          const lastUpdated = (restaurantsService as any).getRestaurantsLastUpdated();
          await (await import('@shared/wolt')).setLastNotifiedOpenAt(chatId, restaurant, lastUpdated);
        } catch (err) {
          // ignore
        }
      }

      await ctx.react('🤝').catch(() => {});
      notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, restaurant }, userDetails);
    } catch (err) {
      throw err;
    }
  }

  async makePermanent(ctx: Context, chatId: number, userDetails: UserDetails, restaurant: string): Promise<void> {
    const existing = await (await import('@shared/wolt')).getSubscription(chatId, restaurant);
    if (!existing) {
      await ctx.answerCallbackQuery({ text: 'לא נמצאה התראה להפוך לקבוע' });
      return;
    }
    await (await import('@shared/wolt')).setSubscriptionPermanent(chatId, restaurant, true);
    await ctx.answerCallbackQuery({ text: 'התראה הוגדרה כקבועה' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply(`התראה ל${restaurant} הוגדרה כקבועה (עד לביטול).`);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, restaurant }, userDetails);
  }

  async makeTemporary(ctx: Context, chatId: number, userDetails: UserDetails, restaurant: string): Promise<void> {
    const existing = await (await import('@shared/wolt')).getSubscription(chatId, restaurant);
    if (!existing) {
      await ctx.answerCallbackQuery({ text: 'לא נמצאה התראה להפוך לזמנית' });
      return;
    }
    await (await import('@shared/wolt')).setSubscriptionPermanent(chatId, restaurant, false);
    await ctx.answerCallbackQuery({ text: 'התראה הוגדרה לזמנית (4 שעות)' });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    await ctx.reply(`התראה ל${restaurant} הוגדרה לזמנית ל-4 שעות.`);
    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SUBSCRIBE, restaurant }, userDetails);
  }

  async changePage(ctx: Context, userDetails: UserDetails, restaurant: string, page: number): Promise<void> {
    const restaurants = await restaurantsService.getRestaurants();
    let matchedRestaurants = getRestaurantsByName(restaurants, restaurant);
    if (matchedRestaurants.length > MAX_NUM_OF_RESTAURANTS_TO_SHOW) {
      matchedRestaurants = await rankRestaurantsByRelevance(matchedRestaurants, restaurant);
    }
    const from = MAX_NUM_OF_RESTAURANTS_TO_SHOW * (page - 1);
    const to = from + MAX_NUM_OF_RESTAURANTS_TO_SHOW;
    const newPageRestaurants = matchedRestaurants.slice(from, to);

    const keyboard = new InlineKeyboard();
    for (const r of newPageRestaurants) {
      keyboard.text(`${r.name} - ${r.isOnline ? '🟢 זמין 🟢' : '🛑 לא זמין 🛑'}`, [BOT_ACTIONS.ADD, r.name].join(INLINE_KEYBOARD_SEPARATOR));
      if (r.isOnline) {
        keyboard.success();
      } else {
        keyboard.danger();
      }
      keyboard.row();
    }

    const previousPageExists = page > 1;
    const nextPageExists = to < matchedRestaurants.length;
    if (previousPageExists) {
      keyboard.text(['⬅️', `(${page - 1})`, 'דף הקודם'].join(' '), [BOT_ACTIONS.CHANGE_PAGE, restaurant, page - 1].join(INLINE_KEYBOARD_SEPARATOR));
    }
    if (nextPageExists) {
      keyboard.text(['➡️', `(${page + 1})`, 'דף הבא'].join(' '), [BOT_ACTIONS.CHANGE_PAGE, restaurant, page + 1].join(INLINE_KEYBOARD_SEPARATOR));
    }

    await ctx.editMessageReplyMarkup({ reply_markup: keyboard });

    notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CHANGE_PAGE, restaurant }, userDetails);
  }
}
