# Database Patterns

MongoDB database patterns and best practices in MMPS.

## Connection Management

### Setting Up Connections

```typescript
// core/utils/mongo.ts
const connections: Map<string, Db> = new Map();

export async function createMongoConnection(dbName: string): Promise<void> {
  if (!env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable not configured');
  }

  const client = new MongoClient(env.MONGO_URI);
  await client.connect();
  
  const db = client.db(dbName);
  connections.set(dbName, db);
  
  console.log(`Connected to MongoDB database: ${dbName}`);
}

export function getMongoDb(dbName: string): Db {
  const db = connections.get(dbName);
  if (!db) {
    throw new Error(`MongoDB connection for "${dbName}" not found. Call createMongoConnection() first.`);
  }
  return db;
}

export function getMongoCollection<T>(dbName: string, collectionName: string): Collection<T> {
  return getMongoDb(dbName).collection<T>(collectionName);
}
```

### Usage in Features

```typescript
// features/chatbot/chatbot.init.ts
export async function initChatbot(): Promise<void> {
  await createMongoConnection('chatbot-db');
  // ... rest of initialization
}
```

Each bot gets its own database:
- `chatbot-db`
- `coach-db`
- `langly-db`
- `magister-db`
- `wolt-db`
- `worldly-db`

## Type-Safe Collections

### Defining Types

```typescript
import type { ObjectId } from 'mongodb';

export type Reminder = {
  readonly _id?: ObjectId;
  readonly chatId: number;
  readonly userId: number;
  readonly text: string;
  readonly time: string; // Format: "YYYY-MM-DD HH:MM"
  readonly timezone: string;
  readonly status: 'pending' | 'sent' | 'cancelled';
  readonly createdAt: Date;
  readonly sentAt?: Date;
};

export type CreateReminderData = Omit<Reminder, '_id' | 'createdAt' | 'sentAt'>;
```

### Getting Collections

```typescript
function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('chatbot-db', 'reminders');
}

// Use throughout the repository
export async function createReminder(data: CreateReminderData): Promise<void> {
  return getCollection().insertOne({
    ...data,
    createdAt: new Date(),
  });
}
```

## Repository Functions

All database operations use functions (not classes).

### Create Operations

```typescript
export async function createReminder(data: CreateReminderData): Promise<InsertOneResult<Reminder>> {
  return getCollection().insertOne({
    ...data,
    status: 'pending',
    createdAt: new Date(),
  } as Reminder);
}

export async function createManyReminders(
  reminders: CreateReminderData[]
): Promise<InsertManyResult<Reminder>> {
  return getCollection().insertMany(
    reminders.map((r) => ({
      ...r,
      status: 'pending',
      createdAt: new Date(),
    }))
  );
}
```

### Read Operations

```typescript
export async function getReminder(id: ObjectId): Promise<Reminder | null> {
  return getCollection().findOne({ _id: id });
}

export async function getReminders(chatId: number): Promise<Reminder[]> {
  return getCollection().find({ chatId }).toArray();
}

export async function getPendingReminders(): Promise<Reminder[]> {
  return getCollection()
    .find({ status: 'pending' })
    .sort({ time: 1 })
    .toArray();
}

export async function getRemindersAfterTime(chatId: number, afterTime: Date): Promise<Reminder[]> {
  return getCollection()
    .find({
      chatId,
      createdAt: { $gt: afterTime },
    })
    .toArray();
}

export async function countReminders(chatId: number): Promise<number> {
  return getCollection().countDocuments({ chatId });
}
```

### Update Operations

```typescript
export async function updateReminder(id: ObjectId, updates: Partial<Reminder>): Promise<UpdateResult> {
  return getCollection().updateOne(
    { _id: id },
    { $set: { ...updates, updatedAt: new Date() } }
  );
}

export async function updateReminderStatus(
  id: ObjectId,
  status: Reminder['status']
): Promise<UpdateResult> {
  return getCollection().updateOne(
    { _id: id },
    { $set: { status, sentAt: new Date() } }
  );
}

export async function updateManyReminders(
  filter: Partial<Reminder>,
  updates: Partial<Reminder>
): Promise<UpdateResult> {
  return getCollection().updateMany(filter, { $set: updates });
}
```

### Delete Operations

```typescript
export async function deleteReminder(id: ObjectId): Promise<DeleteResult> {
  return getCollection().deleteOne({ _id: id });
}

export async function deleteReminders(chatId: number): Promise<DeleteResult> {
  return getCollection().deleteMany({ chatId });
}

export async function deleteOldReminders(beforeDate: Date): Promise<DeleteResult> {
  return getCollection().deleteMany({ createdAt: { $lt: beforeDate } });
}
```

## Query Patterns

### Filtering

```typescript
// Simple filter
const sent = await getCollection().find({ status: 'sent' }).toArray();

// Complex filter
const recent = await getCollection().find({
  createdAt: { $gte: oneWeekAgo },
  status: { $in: ['pending', 'sent'] },
}).toArray();

// OR condition
const important = await getCollection().find({
  $or: [
    { priority: 'high' },
    { hasAlert: true },
  ],
}).toArray();
```

### Sorting and Pagination

```typescript
// Sorting
const ascending = await getCollection()
  .find()
  .sort({ createdAt: 1 })
  .toArray();

const descending = await getCollection()
  .find()
  .sort({ createdAt: -1 })
  .toArray();

// Pagination
const page = 2;
const pageSize = 10;
const skip = (page - 1) * pageSize;

const paginated = await getCollection()
  .find()
  .skip(skip)
  .limit(pageSize)
  .toArray();
```

### Projection

```typescript
// Return only specific fields
const lightweight = await getCollection()
  .find(
    { chatId },
    { projection: { _id: 1, text: 1, time: 1 } }
  )
  .toArray();

// Exclude fields
const withoutLargeField = await getCollection()
  .find(
    {},
    { projection: { largeContent: 0 } }
  )
  .toArray();
```

## Aggregation Pipeline

```typescript
export async function getRemindersGroupedByHour(): Promise<any[]> {
  return getCollection()
    .aggregate([
      {
        $match: { status: 'pending' },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          reminders: { $push: '$$ROOT' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ])
    .toArray();
}
```

## Bulk Operations

```typescript
export async function bulkUpdateReminders(updates: Array<{
  id: ObjectId;
  status: string;
}>): Promise<BulkWriteResult> {
  const operations = updates.map(({ id, status }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { status } },
    },
  }));

  return getCollection().bulkWrite(operations);
}
```

## Best Practices

### 1. Always Use Types

```typescript
// ✅ CORRECT
function getCollection(): Collection<Reminder> {
  return getMongoCollection<Reminder>('chatbot-db', 'reminders');
}

// ❌ WRONG
function getCollection() {
  return getMongoCollection('chatbot-db', 'reminders');
}
```

### 2. Handle Null Cases

```typescript
export async function getReminder(id: ObjectId): Promise<Reminder | null> {
  const reminder = await getCollection().findOne({ _id: id });
  if (!reminder) {
    return null;
  }
  return reminder;
}
```

### 3. Set Timestamps

```typescript
// On create
createdAt: new Date()

// On update
updatedAt: new Date()

// On status change
sentAt: new Date()
```

### 4. Use Immutable Types

```typescript
export type User = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly createdAt: Date;
};
```

### 5. Validate ObjectId

```typescript
import { ObjectId } from 'mongodb';

export async function getReminder(idString: string): Promise<Reminder | null> {
  if (!ObjectId.isValid(idString)) {
    throw new Error('Invalid reminder ID');
  }
  const id = new ObjectId(idString);
  return getCollection().findOne({ _id: id });
}
```

## Error Handling

```typescript
export async function createReminder(data: CreateReminderData): Promise<void> {
  try {
    await getCollection().insertOne({
      ...data,
      createdAt: new Date(),
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new Error('Reminder with this ID already exists');
    }
    throw new Error(`Failed to create reminder: ${err}`);
  }
}
```

## Performance Tips

1. **Index frequently queried fields**
   ```typescript
   // In MongoDB Atlas or locally
   db.reminders.createIndex({ chatId: 1, createdAt: -1 })
   db.reminders.createIndex({ status: 1 })
   ```

2. **Use projection to reduce data transfer**
   ```typescript
   .find({}, { projection: { largeField: 0 } })
   ```

3. **Use aggregation for complex queries**
   ```typescript
   .aggregate([...])
   ```

4. **Limit results for lists**
   ```typescript
   .limit(100)
   ```

## Next Steps

- [Architecture Patterns](/architecture/patterns)
- [Code Style](/architecture/code-style)
- [Development Testing](/development/testing)
