import { Logger } from '@nestjs/common';
import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from '.';
import { INITIAL_BALANCE, Portfolio, StockHolding } from '../types';

const logger = new Logger('PortfolioRepository');
const getCollection = () => getMongoCollection<Portfolio>(DB_NAME, 'Portfolio');

export async function getPortfolio(chatId: number): Promise<Portfolio | null> {
  try {
    const collection = getCollection();
    return await collection.findOne({ chatId });
  } catch (err) {
    logger.error(`getPortfolio - err: ${err}`);
    return null;
  }
}

export async function createPortfolio(chatId: number): Promise<Portfolio> {
  try {
    const collection = getCollection();
    const now = new Date();
    const portfolio: Portfolio = {
      chatId,
      balance: INITIAL_BALANCE,
      holdings: [],
      createdAt: now,
      updatedAt: now,
    };
    await collection.insertOne(portfolio);
    return portfolio;
  } catch (err) {
    logger.error(`createPortfolio - err: ${err}`);
    throw err;
  }
}

export async function getOrCreatePortfolio(chatId: number): Promise<Portfolio> {
  const portfolio = await getPortfolio(chatId);
  if (portfolio) {
    return portfolio;
  }
  return await createPortfolio(chatId);
}

export async function addHolding(chatId: number, holding: StockHolding, cost: number): Promise<boolean> {
  try {
    const collection = getCollection();
    const portfolio = await getPortfolio(chatId);

    if (!portfolio || portfolio.balance < cost) {
      return false;
    }

    const existingHoldingIndex = portfolio.holdings.findIndex((h) => h.symbol === holding.symbol);

    let updatedHoldings: StockHolding[];
    if (existingHoldingIndex >= 0) {
      const existingHolding = portfolio.holdings[existingHoldingIndex];
      const totalQuantity = existingHolding.quantity + holding.quantity;
      const avgPrice = (existingHolding.buyPrice * existingHolding.quantity + holding.buyPrice * holding.quantity) / totalQuantity;

      updatedHoldings = [...portfolio.holdings];
      updatedHoldings[existingHoldingIndex] = {
        ...existingHolding,
        quantity: totalQuantity,
        buyPrice: avgPrice,
      };
    } else {
      updatedHoldings = [...portfolio.holdings, holding];
    }

    await collection.updateOne({ chatId }, { $set: { holdings: updatedHoldings, balance: portfolio.balance - cost, updatedAt: new Date() } });

    return true;
  } catch (err) {
    logger.error(`addHolding - err: ${err}`);
    return false;
  }
}

export async function removeHolding(chatId: number, symbol: string, quantity: number, salePrice: number): Promise<boolean> {
  try {
    const collection = getCollection();
    const portfolio = await getPortfolio(chatId);

    if (!portfolio) {
      return false;
    }

    const holdingIndex = portfolio.holdings.findIndex((h) => h.symbol === symbol);
    if (holdingIndex === -1) {
      return false;
    }

    const holding = portfolio.holdings[holdingIndex];
    if (holding.quantity < quantity) {
      return false;
    }

    const saleProceeds = quantity * salePrice;
    let updatedHoldings: StockHolding[];

    if (holding.quantity === quantity) {
      updatedHoldings = portfolio.holdings.filter((h) => h.symbol !== symbol);
    } else {
      updatedHoldings = [...portfolio.holdings];
      updatedHoldings[holdingIndex] = {
        ...holding,
        quantity: holding.quantity - quantity,
      };
    }

    await collection.updateOne({ chatId }, { $set: { holdings: updatedHoldings, balance: portfolio.balance + saleProceeds, updatedAt: new Date() } });

    return true;
  } catch (err) {
    logger.error(`removeHolding - err: ${err}`);
    return false;
  }
}
