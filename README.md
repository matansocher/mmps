# NestJS Telegram Bots

This repository contains a NestJS application that hosts multiple Telegram bots. Each bot is designed to handle specific tasks and interact with users through Telegram.

## Table of Contents
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Available Bots](#available-bots)
- [License](#license)

## Getting Started
To run this application, ensure you have Node.js installed. Each bot operates as part of the NestJS ecosystem and interacts with Telegram using the `node-telegram-bot-api` library.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/matansocher/mmps
   cd mmps
   ```
2. Install dependencies:
   ```bash
   npm i
   ```
3. Set up environment variables
   Create a .env file in the root directory and define the required environment variables:
   ```bash
   IS_PROD=false
    
   OPENAI_API_KEY=

   MONGO_DB_URL=
   
   LOCAL_ACTIVE_BOT_ID=#the id of the bot that you want to run (in BOT_CONFIG of each bot)
   PLAYGROUNDS_TELEGRAM_BOT_TOKEN=#a bot token to work with
   NOTIFIER_TELEGRAM_BOT_TOKEN=#another bot token to work with
   ```


## Running the Application
To start the NestJS application:

   ```bash
    npm run start:debug
   ```

## Available Bots
1. **Chatbot** - An AI-powered conversational bot with advanced features
2. **Coach** - Sports scheduler and predictions bot with game recommendations
3. **Define** - A bot to provide word definitions
4. **Educator** - Educational bot that teaches interesting topics with daily lessons
5. **Langly** - Language learning assistant bot
6. **Magister** - A bot with various utility features
7. **Twitter** - Twitter integration bot for automated interactions
8. **Wolt** - Restaurant availability notifier for Wolt delivery service
9. **Worldly** - Geography teacher and quiz bot

## License
This project is licensed under the MIT License.