import { Injectable } from '@nestjs/common';
import { getStockDetails, searchStocks, StockDetail, StockSearchResult } from '@services/yahoo-finance';
import { addHolding, getOrCreatePortfolio, removeHolding } from '@shared/stocks/mongo';
import { Portfolio, StockHolding } from '@shared/stocks/types';

export type PortfolioStatus = {
  balance: number;
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    buyPrice: number;
    currentPrice: number;
    totalValue: number;
    profitLoss: number;
    profitLossPercent: number;
  }>;
  totalInvested: number;
  totalCurrentValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
};

@Injectable()
export class StocksService {
  async searchStocks(query: string, limit: number = 5): Promise<StockSearchResult[]> {
    return await searchStocks(query, limit);
  }

  async getStockDetails(symbol: string): Promise<StockDetail | null> {
    return await getStockDetails(symbol);
  }

  async getPortfolio(chatId: number): Promise<Portfolio> {
    return await getOrCreatePortfolio(chatId);
  }

  async buyStock(chatId: number, symbol: string, quantity: number): Promise<{ success: boolean; message: string }> {
    const stockDetails = await this.getStockDetails(symbol);
    if (!stockDetails) {
      return { success: false, message: `Stock ${symbol} not found` };
    }

    const portfolio = await getOrCreatePortfolio(chatId);
    const cost = stockDetails.regularMarketPrice * quantity;

    if (cost > portfolio.balance) {
      return {
        success: false,
        message: `Insufficient balance. Cost: $${cost.toFixed(2)}, Available: $${portfolio.balance.toFixed(2)}`,
      };
    }

    const holding: StockHolding = {
      symbol: stockDetails.symbol,
      name: stockDetails.shortName || stockDetails.longName,
      quantity,
      buyPrice: stockDetails.regularMarketPrice,
      purchaseDate: new Date(),
    };

    const success = await addHolding(chatId, holding, cost);
    if (success) {
      const sharesText = quantity === 1 ? 'share' : 'shares';
      const quantityDisplay = quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(4);
      return {
        success: true,
        message: `Successfully bought ${quantityDisplay} ${sharesText} of ${stockDetails.symbol} at $${stockDetails.regularMarketPrice.toFixed(2)} per share.\nTotal cost: $${cost.toFixed(2)}`,
      };
    }

    return { success: false, message: 'Failed to complete purchase' };
  }

  async sellStock(chatId: number, symbol: string, quantity: number): Promise<{ success: boolean; message: string }> {
    const portfolio = await getOrCreatePortfolio(chatId);
    const holding = portfolio.holdings.find((h) => h.symbol === symbol);

    if (!holding) {
      return { success: false, message: `You don't own any shares of ${symbol}` };
    }

    if (holding.quantity < quantity) {
      return { success: false, message: `Insufficient shares. You own ${holding.quantity} shares of ${symbol}` };
    }

    const stockDetails = await this.getStockDetails(symbol);
    if (!stockDetails) {
      return { success: false, message: `Unable to get current price for ${symbol}` };
    }

    const success = await removeHolding(chatId, symbol, quantity, stockDetails.regularMarketPrice);
    if (success) {
      const proceeds = quantity * stockDetails.regularMarketPrice;
      const costBasis = quantity * holding.buyPrice;
      const profitLoss = proceeds - costBasis;
      const profitLossPercent = ((profitLoss / costBasis) * 100).toFixed(2);

      return {
        success: true,
        message: `Successfully sold ${quantity} shares of ${symbol} at $${stockDetails.regularMarketPrice.toFixed(2)}. P/L: $${profitLoss.toFixed(2)} (${profitLossPercent}%)`,
      };
    }

    return { success: false, message: 'Failed to complete sale' };
  }

  async getPortfolioStatus(chatId: number): Promise<PortfolioStatus> {
    const portfolio = await getOrCreatePortfolio(chatId);

    if (portfolio.holdings.length === 0) {
      return {
        balance: portfolio.balance,
        holdings: [],
        totalInvested: 0,
        totalCurrentValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercent: 0,
      };
    }

    const holdingsWithCurrentPrices = await Promise.all(
      portfolio.holdings.map(async (holding) => {
        const stockDetails = await this.getStockDetails(holding.symbol);
        const currentPrice = stockDetails?.regularMarketPrice || holding.buyPrice;
        const totalValue = currentPrice * holding.quantity;
        const invested = holding.buyPrice * holding.quantity;
        const profitLoss = totalValue - invested;
        const profitLossPercent = (profitLoss / invested) * 100;

        return {
          symbol: holding.symbol,
          name: holding.name,
          quantity: holding.quantity,
          buyPrice: holding.buyPrice,
          currentPrice,
          totalValue,
          profitLoss,
          profitLossPercent,
        };
      }),
    );

    const totalInvested = holdingsWithCurrentPrices.reduce((sum, h) => sum + h.buyPrice * h.quantity, 0);
    const totalCurrentValue = holdingsWithCurrentPrices.reduce((sum, h) => sum + h.totalValue, 0);
    const totalProfitLoss = totalCurrentValue - totalInvested;
    const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      balance: portfolio.balance,
      holdings: holdingsWithCurrentPrices,
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercent,
    };
  }
}
