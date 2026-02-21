---
layout: home

hero:
  name: "MMPS"
  text: "Multi-Purpose Telegram Bots"
  tagline: "A comprehensive TypeScript application hosting 6 AI-powered Telegram bots"
  image:
    src: /logo.svg
    alt: MMPS

features:
  - icon: 🤖
    title: AI-Powered Bots
    details: 6 specialized Telegram bots powered by OpenAI, Anthropic, and LangChain
  
  - icon: 📚
    title: Chatbot Assistant
    details: Advanced conversational AI with 20+ tools including weather, reminders, and GitHub integration
  
  - icon: ⚽
    title: Sports Analytics
    details: Coach bot with real-time match updates, predictions, and betting analysis
  
  - icon: 🌍
    title: Multi-Purpose
    details: Language learning, course management, restaurant finder, geography education, and more
  
  - icon: 🏗️
    title: Clean Architecture
    details: Plain TypeScript with manual DI, no frameworks, MongoDB backend, and comprehensive testing
  
  - icon: ⚡
    title: Production Ready
    details: Fully operational in production with error handling, monitoring, and scheduled tasks

---

## Quick Links

- **[Getting Started](/guide/getting-started)** - Set up MMPS in 5 minutes
- **[Architecture](/architecture/overview)** - Understand the system design
- **[Available Bots](/bots/overview)** - Explore all 6 bots and their features
- **[Contributing](/development/contributing)** - Help improve MMPS
- **[Deployment](/deployment/production)** - Deploy to production

## Tech Stack

- **Node.js 24.x** - Runtime
- **TypeScript 5.9** - Type-safe development
- **MongoDB** - Data persistence
- **grammY** - Telegram bot framework
- **LangChain + LangGraph** - AI orchestration
- **OpenAI & Anthropic** - Large language models

## Project Overview

MMPS is a multi-purpose Telegram bot platform built with plain TypeScript and Node.js. Each bot operates independently with its own database, services, and scheduled tasks. The application uses manual dependency injection for simplicity and control, with no external frameworks overhead.

### The 6 Bots

1. **Chatbot** - AI-powered conversational assistant with advanced features
2. **Coach** - Sports predictions and analytics with real-time data
3. **Langly** - Language learning companion with daily challenges
4. **Magister** - Course management and lesson reminders
5. **Wolt** - Restaurant availability notifications
6. **Worldly** - Geography education and trivia challenges

## Get Started

```bash
# Clone the repository
git clone https://github.com/matansocher/mmps
cd mmps

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run in development
npm run start:dev

# Or run a specific bot
LOCAL_ACTIVE_BOT_ID=chatbot npm run start:dev
```

For detailed setup instructions, see the [Getting Started Guide](/guide/getting-started).

## Documentation Structure

- **Guide** - Installation, configuration, and getting started
- **Architecture** - System design, patterns, and code guidelines
- **Bots** - Detailed documentation for each of the 6 bots
- **Development** - Contributing guidelines, testing, and extending the platform
- **Deployment** - Production deployment and monitoring

## License

This project is licensed under the MIT License.

## Search Documentation

Use the search feature to quickly find information across all documentation:

- **Desktop**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)
- **Mobile**: Tap the search icon in the header
- Search across all pages, guides, bot documentation, and examples
