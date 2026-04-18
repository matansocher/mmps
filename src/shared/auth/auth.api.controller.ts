import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { registry } from '@core/openapi';
import { Logger } from '@core/utils';
import { startAuthFlow, handleCallback, validateToken, logout } from './auth.service';

extendZodWithOpenApi(z);

const logger = new Logger('AuthApiController');

// --- Zod Schemas ---

const AuthUserSchema = z.object({
  telegramUserId: z.number(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  photoUrl: z.string().optional(),
});

const AuthMeResponseSchema = z.object({
  success: z.boolean(),
  data: AuthUserSchema.optional(),
  error: z.string().optional(),
});

const AuthCallbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});

// --- OpenAPI Registration ---

registry.registerPath({
  method: 'get',
  path: '/api/auth/telegram',
  tags: ['Auth'],
  summary: 'Start Telegram OIDC login flow',
  description: 'Generates PKCE challenge and redirects to Telegram authorization',
  responses: {
    302: { description: 'Redirect to Telegram OAuth' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/telegram/callback',
  tags: ['Auth'],
  summary: 'Telegram OIDC callback',
  description: 'Handles the authorization code exchange and creates a session',
  responses: {
    302: { description: 'Redirect with session token' },
    400: { description: 'Invalid callback parameters' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/me',
  tags: ['Auth'],
  summary: 'Get current authenticated user',
  description: 'Returns user profile for the provided session token',
  responses: {
    200: {
      description: 'Authenticated user profile',
      content: { 'application/json': { schema: AuthMeResponseSchema } },
    },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  tags: ['Auth'],
  summary: 'Logout and invalidate session',
  responses: {
    200: { description: 'Logged out successfully' },
  },
});

// --- Route Registration ---

export function registerAuthRoutes(app: Express): void {
  // Start Telegram login flow
  app.get('/api/auth/telegram', async (req: Request, res: Response) => {
    try {
      const appName = (req.query.app as string) || 'unknown';
      const authUrl = await startAuthFlow(appName);
      res.redirect(authUrl);
    } catch (err) {
      logger.error(`Failed to start auth flow: ${err}`);
      res.status(500).json({ success: false, error: 'Failed to start authentication' });
    }
  });

  // Telegram OIDC callback
  app.get('/api/auth/telegram/callback', async (req: Request, res: Response) => {
    try {
      const parseResult = AuthCallbackQuerySchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json({ success: false, error: 'Missing code or state parameter' });
        return;
      }

      const { code, state } = parseResult.data;
      const { token } = await handleCallback(code, state);

      // Redirect with token as fragment — chrome.identity.launchWebAuthFlow will intercept this
      res.redirect(`${req.protocol}://${req.get('host')}/api/auth/success#token=${token}`);
    } catch (err) {
      logger.error(`Auth callback failed: ${err}`);
      res.redirect(`${req.protocol}://${req.get('host')}/api/auth/success#error=auth_failed`);
    }
  });

  // Success page — just needs to exist so the redirect URL resolves
  app.get('/api/auth/success', (_req: Request, res: Response) => {
    res.send('<html><body>Authentication complete. You can close this window.</body></html>');
  });

  // Get current user
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        res.status(401).json({ success: false, error: 'No token provided' });
        return;
      }

      const user = await validateToken(token);
      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
        return;
      }

      res.json({
        success: true,
        data: {
          telegramUserId: user.telegramUserId,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          photoUrl: user.photoUrl,
        },
      });
    } catch (err) {
      logger.error(`Failed to get user: ${err}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Logout
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (token) {
        await logout(token);
      }

      res.json({ success: true });
    } catch (err) {
      logger.error(`Logout failed: ${err}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
}
