# AI Tools Development

Guide to creating and integrating AI tools.

## Overview

AI tools allow the chatbot to perform specific actions like getting weather, setting reminders, etc.

## Tool Structure

```typescript
// shared/ai/tools/{name}/{name}.tool.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 1. Define schema with Zod
const schema = z.object({
  location: z.string().describe('City or location name'),
  date: z.string().optional().describe('Date in YYYY-MM-DD format'),
});

// 2. Implement runner function
async function runner(input: z.infer<typeof schema>) {
  const { location, date } = input;
  
  // Fetch data from API
  const data = await getWeatherData(location, date);
  
  // Return formatted result
  return formatWeatherResponse(data);
}

// 3. Export tool
export const weatherTool = tool(runner, {
  name: 'weather',
  description: 'Get weather information for a location',
  schema,
});
```

## Schema Definition

Use `.describe()` for parameter descriptions:

```typescript
const schema = z.object({
  action: z.enum(['current', 'forecast']).describe('Weather type'),
  location: z.string().describe('City name or coordinates'),
  days: z.number().optional().describe('Number of forecast days (1-14)'),
});
```

## Best Practices

1. **Return formatted strings** - AI can read and format responses
2. **Handle errors gracefully** - Return error messages, don't throw
3. **Keep results concise** - Limit response length
4. **Validate input** - Use Zod for automatic validation
5. **Cache when possible** - Avoid redundant API calls

## Registering Tools

Add to chatbot agent in `features/chatbot/agent/index.ts`:

```typescript
import { weatherTool } from '@shared/ai/tools/weather';

export function getTools() {
  return [
    weatherTool,
    // ... other tools
  ];
}
```

## Testing Tools

```typescript
describe('weatherTool', () => {
  test('should return current weather', async () => {
    const result = await weatherTool.invoke({
      action: 'current',
      location: 'New York',
    });
    expect(result).toContain('temperature');
  });
});
```

## Available Tools

The chatbot has 20+ tools:
- Weather
- Reminders
- Calendar
- GitHub
- Google Sheets
- Web Search
- Todo Lists
- And more

## Next Steps

- [Contributing Guide](/development/contributing)
- [Testing Guide](/development/testing)
