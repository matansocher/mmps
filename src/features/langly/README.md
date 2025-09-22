# Langly - Spanish Teacher Bot 🇪🇸

A fun and engaging Spanish teacher bot for intermediate learners, focusing on practical, real-world Spanish. Uses OpenAI's API to generate dynamic, culturally-rich content.

## Features

### 🤖 AI-Powered Content Generation
- **Dynamic Lessons**: Each lesson is uniquely generated using OpenAI's API
- **Smart Challenges**: Contextual quizzes that adapt to intermediate level
- **Cultural Context**: AI includes regional variations and cultural notes
- **Fallback Content**: Pre-defined content library as backup

### 🌞 Morning Lessons (9 AM)
- AI-generated idiomatic expressions with literal translations
- Regional variations and slang
- False friends (words that look similar but mean different things)
- Cultural context and origins
- Pronunciation audio support with Spanish voice

### 🌙 Evening Challenges (7 PM)
- Multiple choice quizzes with 4 options
- False friend challenges
- Regional variation tests
- Real-world scenarios
- Helpful hints without giving away answers

### 🎮 Interactive Elements
- **Audio Pronunciation**: Text-to-speech with Spanish accent
- **Interactive Buttons**: Answer challenges with button clicks
- **In-Memory Storage**: Simple, lightweight challenge tracking
- **Random Lessons**: Get AI-generated content on demand

## Commands

- `/start` - Initialize and activate daily lessons
- `/lesson` - Get an AI-generated Spanish lesson
- `/challenge` - Start an interactive challenge
- `/random` - Get a random Spanish expression
- `/help` - Show help and settings

## Setup

### Environment Variables

Add to your `.env` file:
```
LANGLY_TELEGRAM_BOT_TOKEN=your_bot_token_here
LOCAL_ACTIVE_BOT_ID=LANGLY  # For local development
OPENAI_API_KEY=your_openai_api_key  # Required for AI generation
```

### No Database Required!
This bot uses:
- **In-memory storage** for active users and challenges
- **OpenAI API** for dynamic content generation
- **Fallback content** from pre-defined libraries

## AI Content Generation

### Lesson Generation
The bot uses structured prompts with Zod schemas to generate:
- Spanish expressions with cultural context
- Pronunciation guides
- Real-world examples
- Regional variations

### Challenge Generation
AI creates engaging challenges with:
- Scenario-based questions
- Plausible wrong answers
- Cultural explanations
- Fun facts about Spanish

## Technical Architecture

```
langly/
├── langly.module.ts           # Module registration
├── langly.config.ts           # Configuration and AI prompts
├── langly.controller.ts       # Telegram bot handlers
├── langly.service.ts          # Core logic with AI integration
├── langly-scheduler.service.ts # Cron jobs with in-memory storage
├── types.ts                   # Zod schemas for AI responses
└── content/                   # Fallback content library
    ├── expressions.ts         # 15+ Spanish expressions
    ├── false-friends.ts       # 15 false friends
    └── challenges.ts          # 12 pre-defined challenges
```

## How It Works

1. **User Registration**: `/start` adds user to in-memory active list
2. **Content Generation**: OpenAI API generates lessons/challenges using Zod schemas
3. **Fallback System**: If API fails, uses pre-defined content
4. **Challenge Tracking**: In-memory Map stores active challenges (auto-cleanup after 1 hour)
5. **Scheduling**: Cron jobs check in-memory user list for daily distribution

## Development

### Testing Locally

1. Set `LOCAL_ACTIVE_BOT_ID=LANGLY` in `.env`
2. Add your OpenAI API key
3. Run `npm run dev`
4. The bot will be active and respond to commands

### Adding Fallback Content

1. **Expressions**: Add to `content/expressions.ts`
2. **False Friends**: Add to `content/false-friends.ts`
3. **Challenges**: Add to `content/challenges.ts`

### AI Prompt Customization

Edit prompts in `langly.config.ts`:
- `LESSON_GENERATION_PROMPT` - Controls lesson style
- `CHALLENGE_GENERATION_PROMPT` - Controls challenge difficulty

## Features

### Simple & Lightweight
- ✅ No database required
- ✅ In-memory storage for active users
- ✅ Automatic cleanup of old challenges
- ✅ Minimal dependencies

### AI-Powered
- ✅ Dynamic content generation
- ✅ Structured responses with Zod
- ✅ Fallback to pre-defined content
- ✅ Cultural context included

### Interactive
- ✅ Button-based answers
- ✅ Audio pronunciation
- ✅ Hint system
- ✅ Immediate feedback

## Future Enhancements

- [ ] Persist user preferences to file system
- [ ] Add more Spanish voices for pronunciation
- [ ] Cache successful AI generations
- [ ] Add conversation practice mode
- [ ] Track learning streaks in memory
- [ ] Add more regional variations

## Notes

- Designed for intermediate learners
- Focus on practical, conversational Spanish
- No complex gamification - just fun learning
- Emphasis on cultural context and real usage
- Lightweight POC - no database overhead
