export const SUBSCRIPTION_MODEL = {
  chatId: Number,
  restaurant: String,
  isActive: Boolean,
  createdAt: Number,
};

export const USER_MODEL = {
  telegramUserId: Number,
  chatId: Number,
  firstName: String,
  lastName: String,
  username: String,
};

export const ANALYTIC_LOG_MODEL = {
  eventName: String,
  restaurant: String,
  isActive: Boolean,
  createdAt: Number,
};
