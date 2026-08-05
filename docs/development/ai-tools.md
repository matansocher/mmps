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

1. Export from the barrel `src/shared/ai/tools/index.ts`:

```typescript
export * from './weather/weather.tool';
```

2. Add to the tools array in `src/features/chatbot/agent/agent.ts`:

```typescript
import { weatherTool } from '@shared/ai/tools';

export function agent(): AgentDescriptor {
  const tools = [
    weatherTool,
    // ... other tools
  ];
  return { name: AGENT_NAME, prompt: AGENT_PROMPT, description: AGENT_DESCRIPTION, tools };
}
```

3. Update the agent's system prompt in `agent.ts` so the model knows when to use the tool.

::: tip
Use the `/scaffold-ai-tool` skill to generate all of this automatically.
:::

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

27 tools are registered in `src/features/chatbot/agent/agent.ts`, grouped by domain:

- **Personal / productivity**: calendar, gmail, reminders, contacts, meetups, recipes, exercise, exercise-analytics
- **Media / social**: spotify, spotify-podcast, tiktok, twitter, youtube, telegram-channels
- **Information**: weather, earthquake
- **Sports / games**: competitions-list, competition-matches, competition-table, match-summary, top-matches-for-prediction, match-prediction, makavdia, wolt, worldly
- **Markets**: polymarket
- **Dev tooling**: github

Additional tool directories exist in `src/shared/ai/tools/` (audio, crypto, flights, image, maps, music, rain-radar, stocks) but are not currently registered.

## GitHub Tool

The GitHub tool enables AI-powered GitHub repository interactions.

### Configuration

Set GitHub App credentials in `.env`:

```bash
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
GITHUB_APP_INSTALLATION_ID=456789
```

**Finding the Installation ID:**

**For Personal Account:**
1. Go to [github.com/settings/installations](https://github.com/settings/installations)
2. Click on your GitHub App installation
3. The URL will be: `https://github.com/settings/installations/{installation-id}`
4. Copy the installation ID from the URL

**For Organization:**
1. Go to `https://github.com/organizations/{org-name}/settings/installations`
2. Click on your GitHub App installation
3. The URL will be: `https://github.com/organizations/{org-name}/settings/installations/{installation-id}`
4. Copy the installation ID from the URL

**Alternative:** Check your GitHub App's webhook payloads for `installation.id`

### Actions

The GitHub tool supports 12 actions:

- `create_issue` - Create a new issue with title, body, labels, assignees
- `get_issue` - Get details of a specific issue
- `update_issue` - Update issue (title, body, state, labels)
- `comment_issue` - Add a comment to an issue
- `comment_pr` - Add a comment to a pull request
- `add_labels` - Add labels to an issue or pull request
- `list_issues` - List issues (filter by state, labels)
- `list_prs` - List pull requests (filter by state)
- `get_pr` - Get details of a specific pull request
- `get_pr_checks` - Get CI/CD status checks for a pull request
- `list_pr_files` - List files changed in a pull request
- `get_pr_reviews` - Get reviews for a pull request

### Service Architecture

The GitHub service is organized into focused modules:

```
services/github/
├── constants.ts              # Repo config (matansocher/mmps)
├── types.ts                  # Type definitions
├── index.ts                  # Barrel exports
└── utils/
    ├── octokit.ts            # Octokit client
    ├── mappers.ts            # Data transformers
    ├── create-issue.ts
    ├── get-issue.ts
    ├── update-issue.ts
    ├── create-issue-comment.ts
    ├── create-pull-request-comment.ts
    ├── list-issues.ts
    ├── list-pull-requests.ts
    └── index.ts              # Barrel exports
```

Each function has:
- Single responsibility
- Proper Octokit type definitions
- Individual error handling
- Logger instance
- Consistent response format

### GitHub AI Workflows

The chatbot can trigger automated GitHub Actions workflows:

**Code Review Workflow**
- Trigger: Add the `review` label to a pull request
- Action: Uses Claude to analyze code quality, suggest improvements, check for bugs
- Use case: Request AI-powered code review with natural language like "review this PR" or "analyze this pull request"

**Implementation Workflow**
- Trigger: Add the `implement` label to an issue
- Action: Uses Claude to generate implementation code and create a new pull request
- Use case: Request implementation generation with natural language like "implement this issue" or "generate code for this"

Both workflows are configured in `.github/workflows/claude.yml` and use Claude Code Action.

When the chatbot recognizes these requests, it uses the GitHub tool to add the appropriate label, triggering the automation:

```typescript
// For PR review request
await addLabels(prNumber, ['review']);

// For issue implementation request
await addLabels(issueNumber, ['implement']);
```

## Next Steps

- [Contributing Guide](/development/contributing)
- [Testing Guide](/development/testing)
