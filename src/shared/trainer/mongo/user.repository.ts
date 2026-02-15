import { createUserRepository } from '@core/mongo';
import { DB_NAME } from '.';

export const { saveUserDetails, getUserDetails } = createUserRepository(DB_NAME);
