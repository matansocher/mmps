import type { Express, Request, Response } from 'express';
import { env } from 'node:process';
import { isProd } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { SAVINGS_SESSION_COOKIE, SAVINGS_SESSION_TTL_SECONDS } from '../constants';
import { getSavingsPortfolio, saveSavingsPortfolio } from '../mongo';
import { createSavingsSessionToken, passwordsMatch } from './auth';
import { savingsAuthMiddleware } from './auth.middleware';
import { EMPTY_SAVINGS_PORTFOLIO, parseSaveSavingsPortfolioBody, type SaveSavingsPortfolioBody, type SavingsApiError, type SavingsPortfolioResponse, toSavingsPortfolioDto } from './dto';

const logger = new Logger('SavingsApiController');

type LoginBody = {
  readonly password?: unknown;
};

function sessionCookie(value: string, maxAge: number): string {
  const secure = isProd ? '; Secure' : '';
  return `${SAVINGS_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function registerSavingsApiRoutes(app: Express): void {
  app.use('/api/savings', (_req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.post('/api/savings/auth/login', (req: Request<object, object, LoginBody>, res: Response<{ success: true } | SavingsApiError>) => {
    const configuredPassword = env.SAVINGS_APP_PASSWORD;
    if (!configuredPassword) {
      logger.error('SAVINGS_APP_PASSWORD not configured');
      res.status(500).json({ error: 'savings_auth_not_configured' });
      return;
    }

    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!password || !passwordsMatch(password, configuredPassword)) {
      res.status(401).json({ error: 'invalid_password' });
      return;
    }

    const token = createSavingsSessionToken(configuredPassword);
    res.setHeader('Set-Cookie', sessionCookie(token, SAVINGS_SESSION_TTL_SECONDS));
    res.json({ success: true });
  });

  app.post('/api/savings/auth/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', sessionCookie('', 0));
    res.status(204).end();
  });

  app.use('/api/savings/portfolio', savingsAuthMiddleware);

  app.get('/api/savings/portfolio', async (_req: Request, res: Response<SavingsPortfolioResponse | SavingsApiError>) => {
    try {
      const portfolio = (await getSavingsPortfolio()) ?? EMPTY_SAVINGS_PORTFOLIO;
      res.json({ portfolio: toSavingsPortfolioDto(portfolio) });
    } catch (err) {
      logger.error(`Failed to load savings portfolio: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'portfolio_load_failed' });
    }
  });

  app.put('/api/savings/portfolio', async (req: Request<object, object, SaveSavingsPortfolioBody>, res: Response<SavingsPortfolioResponse | SavingsApiError>) => {
    try {
      const body = parseSaveSavingsPortfolioBody(req.body);
      if (!body) {
        res.status(400).json({ error: 'invalid_portfolio' });
        return;
      }

      const result = await saveSavingsPortfolio(body);
      if (result.status === 'conflict') {
        res.status(409).json({
          error: 'revision_conflict',
          portfolio: toSavingsPortfolioDto(result.portfolio ?? EMPTY_SAVINGS_PORTFOLIO),
        });
        return;
      }

      res.json({ portfolio: toSavingsPortfolioDto(result.portfolio) });
    } catch (err) {
      logger.error(`Failed to save savings portfolio: ${getErrorMessage(err)}`);
      res.status(500).json({ error: 'portfolio_save_failed' });
    }
  });

  logger.log('Savings API routes registered at /api/savings/*');
}
