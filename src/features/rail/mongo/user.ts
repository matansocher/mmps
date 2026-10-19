import { createUserRepository } from '@core/mongo';
import { DB_NAME } from './constants';

export const { saveUserDetails } = createUserRepository(DB_NAME);
