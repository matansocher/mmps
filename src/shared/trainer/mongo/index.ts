export const DB_NAME = 'Trainer';

export { addExercise, getTodayExercise, getExercises } from './exercise.repository';
export { saveUserDetails, getUserDetails } from './user.repository';
export { getUserPreference, getActiveUsers, createUserPreference, updateUserPreference } from './user-preferences.repository';
