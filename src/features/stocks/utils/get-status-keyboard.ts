import { getInlineKeyboardMarkup } from '@services/telegram';
import { BOT_ACTIONS } from '../stocks.config';
import { PortfolioStatus } from '../stocks.service';

export function getStatusKeyboard(status: PortfolioStatus): ReturnType<typeof getInlineKeyboardMarkup> {
  if (status.holdings.length === 0) {
    return getInlineKeyboardMarkup([{ text: 'No holdings yet', callback_data: BOT_ACTIONS.EMPTY }]);
  }

  const headerRow = [
    { text: 'Symbol', callback_data: BOT_ACTIONS.EMPTY },
    { text: 'Qty', callback_data: BOT_ACTIONS.EMPTY },
    { text: 'Buy $', callback_data: BOT_ACTIONS.EMPTY },
    { text: 'Current $', callback_data: BOT_ACTIONS.EMPTY },
    { text: 'P/L %', callback_data: BOT_ACTIONS.EMPTY },
  ];

  const stockRows = status.holdings.flatMap((holding) => {
    const plSymbol = holding.profitLoss >= 0 ? '📈' : '📉';
    const plPercent = `${plSymbol} ${holding.profitLossPercent.toFixed(2)}%`;

    return [
      { text: holding.symbol, callback_data: `${BOT_ACTIONS.SELECT_STOCK} - ${holding.symbol}` },
      { text: holding.quantity.toString(), callback_data: BOT_ACTIONS.EMPTY },
      { text: `$${holding.buyPrice.toFixed(2)}`, callback_data: BOT_ACTIONS.EMPTY },
      { text: `$${holding.currentPrice.toFixed(2)}`, callback_data: BOT_ACTIONS.EMPTY },
      { text: plPercent, callback_data: BOT_ACTIONS.EMPTY },
    ];
  });

  const totalRow = [
    { text: '═══════', callback_data: BOT_ACTIONS.EMPTY },
    { text: '═══════', callback_data: BOT_ACTIONS.EMPTY },
    { text: '═══════', callback_data: BOT_ACTIONS.EMPTY },
    { text: '═══════', callback_data: BOT_ACTIONS.EMPTY },
    { text: '═══════', callback_data: BOT_ACTIONS.EMPTY },
  ];

  const summaryRow = [
    { text: 'TOTAL', callback_data: BOT_ACTIONS.EMPTY },
    { text: ' ', callback_data: BOT_ACTIONS.EMPTY },
    { text: `$${status.totalInvested.toFixed(2)}`, callback_data: BOT_ACTIONS.EMPTY },
    { text: `$${status.totalCurrentValue.toFixed(2)}`, callback_data: BOT_ACTIONS.EMPTY },
    { text: `${status.totalProfitLoss >= 0 ? '📈' : '📉'} ${status.totalProfitLossPercent.toFixed(2)}%`, callback_data: BOT_ACTIONS.EMPTY },
  ];

  const inlineKeyboardButtons = [...headerRow, ...stockRows, ...totalRow, ...summaryRow];

  return getInlineKeyboardMarkup(inlineKeyboardButtons, 5);
}

export function getStockSearchKeyboard(stocks: Array<{ symbol: string; shortName: string; longName: string }>): ReturnType<typeof getInlineKeyboardMarkup> {
  const buttons = stocks.map((stock) => ({
    text: `${stock.symbol} - ${stock.shortName || stock.longName}`,
    callback_data: `${BOT_ACTIONS.SELECT_STOCK} - ${stock.symbol}`,
  }));

  return getInlineKeyboardMarkup(buttons, 1);
}

export function getStockActionKeyboard(symbol: string, userOwnsStock: boolean): ReturnType<typeof getInlineKeyboardMarkup> {
  const buttons = [{ text: '💰 Buy', callback_data: `${BOT_ACTIONS.BUY} - ${symbol}` }];

  if (userOwnsStock) {
    buttons.push({ text: '💸 Sell', callback_data: `${BOT_ACTIONS.SELL} - ${symbol}` });
  }

  return getInlineKeyboardMarkup(buttons, buttons.length);
}
