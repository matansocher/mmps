import type { ObjectId } from 'mongodb';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'fasting';

export type SugarReading = {
  readonly minutesAfterMeal: number; // 0, 30, 60, 120
  readonly value: number; // mg/dL
  readonly timestamp: Date;
};

export type SugarSession = {
  readonly _id: ObjectId;
  readonly chatId: number;
  readonly startedAt: Date;
  readonly closedAt?: Date;
  readonly mealDescription: string;
  readonly foods: string[]; // Extracted food items for querying
  readonly mealType?: MealType;
  readonly readings: SugarReading[];
  readonly notes?: string;
  readonly tags?: string[];
};

export type CreateSugarSessionData = {
  readonly chatId: number;
  readonly mealDescription: string;
  readonly foods?: string[];
  readonly mealType?: MealType;
  readonly tags?: string[];
};

export type SugarSessionMetrics = {
  readonly peakValue: number;
  readonly peakTime: number; // minutes after meal
  readonly baselineValue: number | null; // 0 min reading
  readonly delta: number | null; // peak - baseline
  readonly readingCount: number;
};
