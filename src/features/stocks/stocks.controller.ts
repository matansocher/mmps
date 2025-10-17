import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MY_USER_NAME } from '@core/config';
import { NotifierService } from '@core/notifier';
import { getStockActionKeyboard, getStockSearchKeyboard, getTopStocksKeyboard } from '@features/stocks/utils';
import { getBotToken, getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, MessageLoader, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler, UserDetails } from '@services/telegram';
import { addSubscription, getSubscription, saveUserDetails, updateSubscription } from '@shared/stocks/mongo';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './stocks.config';
import { StocksService } from './stocks.service';

const customErrorMessage = 'Sorry, something went wrong. Please try again later 🙁';

@Injectable()
export class StocksController implements OnModuleInit {
  private readonly logger = new Logger(StocksController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);
  private readonly userStates = new Map<number, { action: 'buy' | 'sell'; symbol: string }>();

  constructor(
    private readonly stocksService: StocksService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, TEXT, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, STATUS, TOP, ACTIONS } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: STATUS.command, handler: (message) => this.statusHandler.call(this, message) },
      { event: COMMAND, regex: TOP.command, handler: (message) => this.topHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: TEXT, handler: (message) => this.textHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, customErrorMessage });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async statusHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);

    const portfolioStatus = await this.stocksService.getPortfolioStatus(chatId);

    let statusMessage: string;

    if (portfolioStatus.holdings.length === 0) {
      statusMessage = [
        `📊 *Portfolio Status* 📊`,
        ``,
        `💰 Available Balance: $${portfolioStatus.balance.toFixed(2)}`,
        ``,
        `You haven't made any investments yet!`,
        `Search for a stock to get started.`,
      ].join('\n');
    } else {
      const holdingsTable = portfolioStatus.holdings.map((h) => {
        const plSymbol = h.profitLoss >= 0 ? '📈' : '📉';
        const symbol = h.symbol.padEnd(7);
        const qtyDisplay = h.quantity % 1 === 0 ? h.quantity.toString() : h.quantity.toFixed(4);
        const qty = qtyDisplay.padStart(8);
        const buyPrice = h.buyPrice.toFixed(2).padStart(7);
        const currentPrice = h.currentPrice.toFixed(2).padStart(7);
        const plPercent = `${plSymbol} ${h.profitLossPercent.toFixed(2)}%`;
        return `${symbol}|${qty}|${buyPrice}|${currentPrice}|${plPercent}`;
      });

      const totalPLSymbol = portfolioStatus.totalProfitLoss >= 0 ? '📈' : '📉';

      statusMessage = [
        `📊 *Portfolio Status* 📊`,
        ``,
        `💰 *Available Balance:* $${portfolioStatus.balance.toFixed(2)}`,
        `📈 *Total Invested:* $${portfolioStatus.totalInvested.toFixed(2)}`,
        `💵 *Current Value:* $${portfolioStatus.totalCurrentValue.toFixed(2)}`,
        `${totalPLSymbol} *Total P/L:* $${portfolioStatus.totalProfitLoss.toFixed(2)} (${portfolioStatus.totalProfitLossPercent.toFixed(2)}%)`,
        ``,
        `*Holdings:*`,
        `\`\`\``,
        `Symbol |     Qty|   Buy$|   Now$| P/L%`,
        `-------|--------+-------+-------+----------`,
        ...holdingsTable,
        `\`\`\``,
      ].join('\n');
    }

    // Commented out keyboard version - keeping for reference
    // const keyboard = getStatusKeyboard(portfolioStatus);
    // await this.bot.sendMessage(chatId, statusMessage, { ...keyboard, parse_mode: 'Markdown' });

    await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STATUS }, userDetails);
  }

  private async topHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const keyboard = getTopStocksKeyboard();
    await this.bot.sendMessage(chatId, '🔥 *Top Stocks & Indexes*\n\nSelect a stock or index to view details:', { ...keyboard, parse_mode: 'Markdown' });
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const subscription = await getSubscription(chatId);
    const inlineKeyboardButtons = [
      !subscription?.isActive ? { text: '🟢 Start daily updates 🟢', callback_data: `${BOT_ACTIONS.START}` } : { text: '🛑 Stop daily updates 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 Contact 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '⚙️ How can I help you?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch(() => {});
  }

  async textHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails, text } = getMessageData(message);

    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    // Check if user is in the middle of a buy/sell transaction
    const userState = this.userStates.get(chatId);
    if (userState) {
      await this.handleTransactionAmount(chatId, text, userState, userDetails);
      this.userStates.delete(chatId);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, {});
    await messageLoaderService.handleMessageWithLoader(async () => {
      const stockSearchResults = await this.stocksService.searchStocks(text, 10);
      if (stockSearchResults.length === 0) {
        await this.bot.sendMessage(chatId, `I couldn't find any stocks matching "${text}". Try searching by company name or symbol.`);
        return;
      }

      const keyboard = getStockSearchKeyboard(stockSearchResults);
      await this.bot.sendMessage(chatId, `🔍 Found ${stockSearchResults.length} results for "${text}":\n\nSelect a stock to view details:`, keyboard);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SEARCH, text }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, userDetails, data: response } = getCallbackQueryData(callbackQuery);

    const [action, param] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.START:
        await this.userStart(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.EMPTY:
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      case BOT_ACTIONS.SELECT_STOCK:
        await this.selectStockHandler(chatId, param);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        break;
      case BOT_ACTIONS.BUY:
        await this.buyStockHandler(chatId, messageId, param, userDetails);
        break;
      case BOT_ACTIONS.SELL:
        await this.sellStockHandler(chatId, messageId, param, userDetails);
        break;
      default:
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Unknown action' });
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, reason: 'invalid action', response }, userDetails);
        throw new Error('Invalid action');
    }
    await this.bot.answerCallbackQuery(callbackQuery.id).catch(() => {});
  }

  private async selectStockHandler(chatId: number, symbol: string): Promise<void> {
    const stockDetails = await this.stocksService.getStockDetails(symbol);
    if (!stockDetails) {
      await this.bot.sendMessage(chatId, `Unable to fetch details for ${symbol}`);
      return;
    }

    const portfolio = await this.stocksService.getPortfolio(chatId);
    const holding = portfolio.holdings.find((h) => h.symbol === symbol);

    let positionText = `*You don't own this stock*`;
    if (holding) {
      const sharesText = holding.quantity === 1 ? 'share' : 'shares';
      const qtyDisplay = holding.quantity % 1 === 0 ? holding.quantity.toString() : holding.quantity.toFixed(4);
      const totalValue = holding.quantity * holding.buyPrice;
      positionText = `*Your Position:* ${qtyDisplay} ${sharesText} @ $${holding.buyPrice.toFixed(2)} (Total: $${totalValue.toFixed(2)})`;
    }

    const detailsMessage = [
      `📊 *${stockDetails.symbol}* - ${stockDetails.shortName || stockDetails.longName}`,
      ``,
      `💵 Current Price: $${stockDetails.regularMarketPrice.toFixed(2)}`,
      `📈 Day High: $${stockDetails.regularMarketDayHigh.toFixed(2)}`,
      `📉 Day Low: $${stockDetails.regularMarketDayLow.toFixed(2)}`,
      `📊 Market Cap: $${(stockDetails.marketCap / 1e9).toFixed(2)}B`,
      `🔄 Volume: ${(stockDetails.regularMarketVolume / 1e6).toFixed(2)}M`,
      ``,
      positionText,
      ``,
      `💰 Available Balance: $${portfolio.balance.toFixed(2)}`,
    ].join('\n');

    const keyboard = getStockActionKeyboard(symbol, !!holding);
    await this.bot.sendMessage(chatId, detailsMessage, { ...keyboard, parse_mode: 'Markdown' });
  }

  private async buyStockHandler(chatId: number, _messageId: number, symbol: string, _userDetails: UserDetails): Promise<void> {
    const stockDetails = await this.stocksService.getStockDetails(symbol);
    if (!stockDetails) {
      await this.bot.sendMessage(chatId, `Unable to fetch current price for ${symbol}`);
      return;
    }

    const portfolio = await this.stocksService.getPortfolio(chatId);

    await this.bot.sendMessage(
      chatId,
      `💰 How much money do you want to spend on *${symbol}*?\n\nCurrent price: $${stockDetails.regularMarketPrice.toFixed(2)}\nAvailable balance: $${portfolio.balance.toFixed(2)}\n\nReply with the dollar amount (e.g., 100 or 500.50):`,
      { parse_mode: 'Markdown' },
    );

    this.userStates.set(chatId, { action: 'buy', symbol });
  }

  private async sellStockHandler(chatId: number, _messageId: number, symbol: string, _userDetails: UserDetails): Promise<void> {
    const stockDetails = await this.stocksService.getStockDetails(symbol);
    if (!stockDetails) {
      await this.bot.sendMessage(chatId, `Unable to fetch current price for ${symbol}`);
      return;
    }

    const portfolio = await this.stocksService.getPortfolio(chatId);
    const holding = portfolio.holdings.find((h) => h.symbol === symbol);

    if (!holding) {
      await this.bot.sendMessage(chatId, `You don't own any shares of ${symbol}`);
      return;
    }

    const totalValue = holding.quantity * stockDetails.regularMarketPrice;

    await this.bot.sendMessage(
      chatId,
      `💸 How much worth of *${symbol}* do you want to sell?\n\nCurrent price: $${stockDetails.regularMarketPrice.toFixed(2)}\nYou own: ${holding.quantity} shares (worth $${totalValue.toFixed(2)})\n\nReply with the dollar amount (e.g., 100 or 500.50):`,
      { parse_mode: 'Markdown' },
    );

    this.userStates.set(chatId, { action: 'sell', symbol });
  }

  private async handleTransactionAmount(chatId: number, text: string, state: { action: 'buy' | 'sell'; symbol: string }, userDetails: UserDetails): Promise<void> {
    const amount = Number(text);

    if (isNaN(amount) || amount <= 0) {
      await this.bot.sendMessage(chatId, '❌ Invalid amount. Transaction cancelled.');
      return;
    }

    const stockDetails = await this.stocksService.getStockDetails(state.symbol);
    if (!stockDetails) {
      await this.bot.sendMessage(chatId, `Unable to fetch current price for ${state.symbol}`);
      return;
    }

    // Calculate fractional shares - allow partial ownership
    const quantity = amount / stockDetails.regularMarketPrice;

    if (quantity < 0.0001) {
      await this.bot.sendMessage(chatId, `❌ Amount too small. Minimum purchase is $0.01 worth of ${state.symbol}.`);
      return;
    }

    if (state.action === 'buy') {
      const result = await this.stocksService.buyStock(chatId, state.symbol, quantity);
      await this.bot.sendMessage(chatId, result.message);
      if (result.success) {
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.BUY, symbol: state.symbol, amount, quantity }, userDetails);
      }
    } else {
      const result = await this.stocksService.sellStock(chatId, state.symbol, quantity);
      await this.bot.sendMessage(chatId, result.message);
      if (result.success) {
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.SELL, symbol: state.symbol, amount, quantity }, userDetails);
      }
    }
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
    const userExists = await saveUserDetails(userDetails);

    const subscription = await getSubscription(chatId);
    subscription ? await updateSubscription(chatId, { isActive: true }) : await addSubscription(chatId);

    await this.stocksService.getPortfolio(chatId);

    const newUserReplyText = [
      `👋 Welcome to the Stock Portfolio Simulator!`,
      ``,
      `You start with $10,000 to invest.`,
      ``,
      `🔍 *Search* - Type any company name or symbol to search for stocks`,
      `📊 *Status* - Use /status to see your portfolio`,
      `⚙️ *Actions* - Use /actions for settings`,
      ``,
      `Try searching for stocks like "Apple", "TSLA", or "^GSPC" (S&P 500)`,
    ].join('\n');
    const existingUserReplyText = `Welcome back! Ready to manage your portfolio? 📈`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText, { parse_mode: 'Markdown' });
  }

  private async stopHandler(chatId: number): Promise<void> {
    await updateSubscription(chatId, { isActive: false });
    await this.bot.sendMessage(chatId, `Okay, I've stopped sending you daily updates 🛑`);
  }

  async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, [`Feel free to contact my creator, they can help you 📬`, MY_USER_NAME].join('\n'));
  }
}
