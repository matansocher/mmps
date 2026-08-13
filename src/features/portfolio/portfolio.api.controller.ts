import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { registry } from '@core/openapi';
import { getErrorMessage, Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { TelegramBotConfig } from '@services/telegram';

extendZodWithOpenApi(z);

const logger = new Logger('contact:api');

const NOTIFY_SOURCE: TelegramBotConfig = {
  id: 'CONTACT',
  name: 'Contact Form 📬',
  token: 'NOTIFIER_TELEGRAM_BOT_TOKEN',
};

export const ContactRequestSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100, 'name is too long').openapi({ description: 'Sender name', example: 'John Doe' }),
  email: z.string().trim().email('invalid email').max(254, 'email is too long').openapi({ description: 'Sender email', example: 'john@example.com' }),
  message: z.string().trim().min(1, 'message is required').max(2000, 'message is too long').openapi({ description: 'Message body', example: 'Hi, I would like to get in touch...' }),
});

const ContactResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().openapi({ description: 'Error message if success is false' }).optional(),
});

registry.registerPath({
  method: 'post',
  path: '/portfolio/contact',
  tags: ['Portfolio'],
  summary: 'Submit a contact form',
  description: 'Receives a website contact form submission and forwards it as a Telegram notification',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ContactRequestSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Submission accepted', content: { 'application/json': { schema: ContactResponseSchema } } },
    400: { description: 'Invalid request body', content: { 'application/json': { schema: ContactResponseSchema } } },
    500: { description: 'Internal server error', content: { 'application/json': { schema: ContactResponseSchema } } },
  },
});

type ContactRequest = z.infer<typeof ContactRequestSchema>;

export function registerPortfolioApiRoutes(app: Express): void {
  // CORS — the contact form is served from external websites
  app.use('/portfolio/contact', (req: Request, res: Response, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.post('/portfolio/contact', (req: Request<object, object, ContactRequest>, res: Response) => {
    try {
      const parseResult = ContactRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({ success: false, error: parseResult.error.issues[0]?.message || 'Invalid request body' });
        return;
      }

      const { name, email, message } = parseResult.data;
      logger.log(`Contact form submission from ${name} <${email}>`);
      notify(NOTIFY_SOURCE, { action: 'contact_form', name, email, plainText: message });

      res.json({ success: true });
    } catch (err) {
      logger.error(`Failed to handle contact form submission: ${getErrorMessage(err)}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });
}
