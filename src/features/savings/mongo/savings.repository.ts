import { MongoServerError } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { SAVINGS_DB_NAME, SAVINGS_PORTFOLIO_COLLECTION, SHARED_PORTFOLIO_ID } from '../constants';
import type { SaveSavingsPortfolioData, SaveSavingsPortfolioResult, SavingsPortfolioDocument } from '../types';

const getCollection = () => getMongoCollection<SavingsPortfolioDocument>(SAVINGS_DB_NAME, SAVINGS_PORTFOLIO_COLLECTION);

export async function getSavingsPortfolio(): Promise<SavingsPortfolioDocument | null> {
  return getCollection().findOne({ _id: SHARED_PORTFOLIO_ID });
}

export async function saveSavingsPortfolio(data: SaveSavingsPortfolioData): Promise<SaveSavingsPortfolioResult> {
  const collection = getCollection();
  const updatedAt = new Date();

  if (data.revision === 0) {
    const document: SavingsPortfolioDocument = {
      _id: SHARED_PORTFOLIO_ID,
      revision: 1,
      settings: data.settings,
      holdings: data.holdings,
      updatedAt,
    };

    try {
      await collection.insertOne(document);
      return { status: 'saved', portfolio: document };
    } catch (err) {
      if (!(err instanceof MongoServerError) || err.code !== 11000) throw err;
      return { status: 'conflict', portfolio: await getSavingsPortfolio() };
    }
  }

  const portfolio = await collection.findOneAndUpdate(
    { _id: SHARED_PORTFOLIO_ID, revision: data.revision },
    {
      $set: {
        settings: data.settings,
        holdings: data.holdings,
        updatedAt,
      },
      $inc: { revision: 1 },
    },
    { returnDocument: 'after' },
  );

  if (portfolio) return { status: 'saved', portfolio };
  return { status: 'conflict', portfolio: await getSavingsPortfolio() };
}
