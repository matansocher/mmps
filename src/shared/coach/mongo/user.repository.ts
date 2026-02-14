import { createUserRepository } from '@core/mongo';
import { DB_NAME } from './subscription.repository';

export const { saveUserDetails, getUserDetails } = createUserRepository(DB_NAME);
