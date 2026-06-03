import type { Express, Request, Response } from 'express';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import type { TelegramBotConfig } from '@services/telegram';
import { addSubscription, archiveSubscription, getActiveSubscriptions, getUserCity, saveUserDetails, setUserCity, WoltRestaurant } from '@shared/wolt';
import { woltAuthMiddleware } from './auth.middleware';
import type { PreferencesResponse, RestaurantItem, RestaurantsListResponse, SubscribeBody, SubscribeResponse, SubscriptionsListResponse, UnsubscribeResponse, UpdatePreferencesBody } from './dto';

const logger = new Logger('WoltApiController');

export type WoltApiDeps = {
  readonly botConfig: TelegramBotConfig;
  readonly analyticEventNames: {
    readonly SUBSCRIBE: string;
    readonly UNSUBSCRIBE: string;
    readonly ERROR: string;
  };
  readonly maxSubscriptions: number;
  readonly getRestaurants: () => Promise<WoltRestaurant[]>;
};

function toRestaurantItem(r: WoltRestaurant): RestaurantItem {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    area: r.area,
    photo: r.photo,
    link: r.link,
    isOnline: Boolean(r.isOnline),
    ...(r.tags ? { tags: r.tags } : {}),
    ...(typeof r.priceRange === 'number' ? { priceRange: r.priceRange } : {}),
    ...(typeof r.rating === 'number' ? { rating: r.rating } : {}),
    ...(typeof r.estimateMinutes === 'number' ? { estimateMinutes: r.estimateMinutes } : {}),
    ...(r.shortDescription ? { shortDescription: r.shortDescription } : {}),
  };
}

function userDetailsFromReq(req: Request) {
  const { telegramUserId, chatId, username, firstName } = req.woltUser!;
  return { telegramUserId, chatId, username: username ?? '', firstName: firstName ?? '', lastName: '' };
}

export function registerWoltApiRoutes(app: Express, deps: WoltApiDeps): void {
  const { botConfig, analyticEventNames, maxSubscriptions, getRestaurants } = deps;

  app.use('/api/wolt', woltAuthMiddleware);

  app.get('/api/wolt/restaurants', async (_req: Request, res: Response<RestaurantsListResponse | { error: string }>) => {
    try {
      const restaurants = await getRestaurants();
      res.json({ restaurants: restaurants.map(toRestaurantItem) });
    } catch (err) {
      logger.error(`restaurants fetch failed: ${err}`);
      res.status(500).json({ error: 'fetch_failed' });
    }
  });

  app.get('/api/wolt/subscriptions', async (req: Request, res: Response<SubscriptionsListResponse | { error: string }>) => {
    const { chatId } = req.woltUser!;
    try {
      const subscriptions = await getActiveSubscriptions(chatId);
      res.json({
        subscriptions: subscriptions.map((s) => ({
          restaurant: s.restaurant,
          photo: s.restaurantPhoto,
          createdAt: s.createdAt.toISOString(),
        })),
        max: maxSubscriptions,
      });
    } catch (err) {
      logger.error(`subscriptions fetch failed: ${err}`);
      res.status(500).json({ error: 'fetch_failed' });
    }
  });

  app.post('/api/wolt/subscriptions', async (req: Request, res: Response<SubscribeResponse | { error: string }>) => {
    const body = req.body as SubscribeBody | undefined;
    if (!body || typeof body.restaurant !== 'string' || !body.restaurant.trim()) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const { chatId } = req.woltUser!;
    const userDetails = userDetailsFromReq(req);
    const restaurant = body.restaurant;

    try {
      await saveUserDetails(userDetails);

      const [activeSubscriptions, restaurants] = await Promise.all([getActiveSubscriptions(chatId), getRestaurants()]);

      if (activeSubscriptions.some((s) => s.restaurant === restaurant)) {
        res.json({ status: 'already_subscribed', restaurant });
        return;
      }
      if (activeSubscriptions.length >= maxSubscriptions) {
        res.json({ status: 'limit_reached', max: maxSubscriptions });
        return;
      }

      const restaurantDetails = restaurants.find((r) => r.name === restaurant);
      if (!restaurantDetails) {
        res.json({ status: 'not_found' });
        return;
      }
      if (restaurantDetails.isOnline) {
        res.json({ status: 'already_open', restaurant, link: restaurantDetails.link });
        return;
      }

      await addSubscription(chatId, restaurant, restaurantDetails.photo, restaurantDetails.slug, restaurantDetails.area);
      notify(botConfig, { action: analyticEventNames.SUBSCRIBE, restaurant, source: 'mini_app' }, userDetails);
      res.json({ status: 'subscribed', restaurant });
    } catch (err) {
      logger.error(`subscribe failed for chatId=${chatId} restaurant=${restaurant}: ${err}`);
      notify(botConfig, { action: analyticEventNames.ERROR, error: `${err}`, method: 'api.subscribe', source: 'mini_app' }, userDetails);
      res.status(500).json({ error: 'subscribe_failed' });
    }
  });

  app.delete('/api/wolt/subscriptions/:restaurant', async (req: Request, res: Response<UnsubscribeResponse | { error: string }>) => {
    const restaurant = decodeURIComponent(req.params.restaurant as string);
    const { chatId } = req.woltUser!;
    const userDetails = userDetailsFromReq(req);
    try {
      const active = await getActiveSubscriptions(chatId);
      const existing = active.find((s) => s.restaurant === restaurant);
      if (!existing) {
        res.json({ status: 'not_found' });
        return;
      }
      await archiveSubscription(chatId, restaurant, false);
      notify(botConfig, { action: analyticEventNames.UNSUBSCRIBE, restaurant, source: 'mini_app' }, userDetails);
      res.json({ status: 'unsubscribed' });
    } catch (err) {
      logger.error(`unsubscribe failed for chatId=${chatId} restaurant=${restaurant}: ${err}`);
      res.status(500).json({ error: 'unsubscribe_failed' });
    }
  });

  app.get('/api/wolt/preferences', async (req: Request, res: Response<PreferencesResponse | { error: string }>) => {
    const { chatId } = req.woltUser!;
    try {
      const city = await getUserCity(chatId);
      res.json({ city });
    } catch (err) {
      logger.error(`preferences fetch failed for chatId=${chatId}: ${err}`);
      res.status(500).json({ error: 'fetch_failed' });
    }
  });

  app.patch('/api/wolt/preferences', async (req: Request, res: Response<PreferencesResponse | { error: string }>) => {
    const body = req.body as UpdatePreferencesBody | undefined;
    if (!body || (body.city !== null && typeof body.city !== 'string')) {
      res.status(400).json({ error: 'invalid_body' });
      return;
    }
    const { chatId } = req.woltUser!;
    const userDetails = userDetailsFromReq(req);
    try {
      await saveUserDetails(userDetails);
      await setUserCity(chatId, body.city);
      notify(botConfig, { action: 'UPDATE_PREFERENCES', city: body.city, source: 'mini_app' }, userDetails);
      res.json({ city: body.city });
    } catch (err) {
      logger.error(`preferences update failed for chatId=${chatId}: ${err}`);
      res.status(500).json({ error: 'update_failed' });
    }
  });

  app.post('/api/wolt/open', async (req: Request, res: Response) => {
    const userDetails = userDetailsFromReq(req);
    notify(botConfig, { action: 'OPEN_APP', source: 'mini_app' }, userDetails);
    res.status(204).end();
  });

  logger.log('Wolt API routes registered at /api/wolt/*');
}
