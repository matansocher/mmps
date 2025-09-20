# Exercise Domain - Shared Module

## Overview
This shared domain module contains all exercise-related functionality that is used by multiple features in the application, specifically the `trainer` and `chatbot` features.

## Architecture Decision
Previously, the chatbot feature was importing MongoDB functions directly from the trainer feature (`../trainer/mongo`), which created an awkward cross-feature dependency. This violated the principle of feature independence and created confusion about ownership and maintenance responsibilities.

The solution was to extract the shared functionality into a dedicated shared domain module following Domain-Driven Design principles.

## Structure

```
src/shared/domains/exercise/
├── index.ts                    # Main export file
├── types.ts                     # Shared types (Exercise, UserPreferences)
├── README.md                    # This file
└── mongo/
    ├── index.ts                 # MongoDB exports
    ├── exercise.repository.ts   # Exercise CRUD operations
    ├── user.repository.ts       # User management
    └── user-preferences.repository.ts  # User preferences management
```

## Database Configuration
- **Database Name**: `Trainer` (kept for backward compatibility)
- **Collections**:
  - `Exercise`: Stores exercise records
  - `User`: Stores user details
  - `UserPreferences`: Stores user preferences (e.g., reminder settings)

## Usage

### Import with Path Aliases
```typescript
// Using the configured TypeScript path alias
import { addExercise, getExercises, getTodayExercise } from '@shared/domains/exercise/mongo';
import { Exercise, UserPreferences } from '@shared/domains/exercise';
```

### Available Functions

#### Exercise Repository
- `addExercise(chatId: number)`: Log a new exercise
- `getTodayExercise(chatId: number)`: Check if user exercised today
- `getExercises(chatId: number, limit?: number)`: Get exercise history

#### User Repository
- `saveUserDetails(userDetails: any)`: Save or update user details
- `getUserDetails(chatId: number)`: Get user details

#### User Preferences Repository
- `getUserPreference(chatId: number)`: Get user preferences
- `getActiveUsers()`: Get all active users (not stopped)
- `createUserPreference(chatId: number)`: Create new user preference
- `updateUserPreference(chatId: number, update: Partial<UserPreferences>)`: Update preferences

## Features Using This Module

### Trainer Feature
- Uses all exercise, user, and preference functions
- Manages exercise tracking and reminders
- Handles user commands and achievements

### Chatbot Feature
- Uses exercise functions for AI-powered exercise tracking
- Integrates with exercise analytics tools
- Provides automated reminders and summaries

## Migration Notes
The following imports were updated during the refactoring:

### Trainer Feature
```typescript
// Before
import { ... } from './mongo';

// After
import { ... } from '@shared/domains/exercise/mongo';
```

### Chatbot Feature
```typescript
// Before
import { ... } from '../trainer/mongo';

// After
import { ... } from '@shared/domains/exercise/mongo';
```

## Future Considerations

1. **Database Name**: Consider renaming from 'Trainer' to 'Exercise' or 'Fitness' for better semantic clarity
2. **Repository Pattern**: Consider implementing a class-based repository pattern for better encapsulation
3. **Type Safety**: Consider creating more specific types instead of using `any` for user details
4. **Testing**: Add unit tests for all repository functions
5. **Caching**: Consider implementing caching for frequently accessed data

## Benefits of This Architecture

1. **Clear Separation of Concerns**: Exercise domain logic is centralized
2. **No Cross-Feature Dependencies**: Features depend on shared modules, not on each other
3. **Maintainability**: Single source of truth for exercise-related functionality
4. **Scalability**: Easy to extend with new exercise-related features
5. **Testability**: Shared domain can be tested independently
6. **Reusability**: Any new feature can easily use exercise functionality

## Contributing
When adding new exercise-related functionality:
1. Add it to this shared domain module if it's used by multiple features
2. Keep feature-specific logic in the respective feature modules
3. Maintain backward compatibility when modifying existing functions
4. Update this README with any new functions or changes
