# Magister

**Course Management** - Learning management system for course tracking and progress.

## Overview

Magister helps students and course creators manage courses, track progress, and receive lesson reminders.

## Features

- 📚 **Course Management** - Create and manage courses
- 📋 **Lesson Tracking** - Track completed lessons
- ⏰ **Lesson Reminders** - Get reminders for upcoming lessons
- 📊 **Progress Reports** - Detailed progress analytics
- 🎓 **Certificates** - Track course completion

## Configuration

### Environment Variables

```bash
# Required
MAGISTER_TELEGRAM_BOT_TOKEN=your-token

# Optional
MONGO_URI=mongodb://...
```

## Getting Started

### 1. Create Bot Token

- Open [@BotFather](https://t.me/botfather)
- Create new bot and copy token

### 2. Run the Bot

```bash
LOCAL_ACTIVE_BOT_ID=magister npm run start:dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Start with Magister |
| `/courses` | View enrolled courses |
| `/lesson [id]` | Get lesson details |
| `/progress` | View your progress |
| `/settings` | Configure reminders |

## Database

**Database name**: `magister-db`

Collections:
- `courses` - Course information
- `enrollments` - Student enrollments
- `lessons` - Lesson content and details
- `progress` - Student progress tracking

## Scheduled Tasks

- **Lesson Reminders** - Configurable reminder times
- **Progress Report** - Weekly progress summary

## Next Steps

- [Bot Overview](/bots/overview)
- [Architecture](/architecture/overview)
- [All Bots](/bots/overview)
