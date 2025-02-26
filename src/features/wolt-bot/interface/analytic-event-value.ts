import { ANALYTIC_EVENT_NAMES } from '../wolt-bot.config';

export type AnalyticEventValue = (typeof ANALYTIC_EVENT_NAMES)[keyof typeof ANALYTIC_EVENT_NAMES];
