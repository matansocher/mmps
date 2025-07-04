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
    
   OPEN_AI_API_KEY=

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
1. Playgrounds - A dev only bot to test telegram stuff
2. Wolt - A bot to notify the user when a Wolt restaurant is open and available to get orders
3. Worldly - A Geography teacher bot
4. Coach - A bot to show the user a daily list of sports games
5. Trainer - A bot to encourage the user the train every day with nice rewards for records.
6. Educator - A bot to teach the user of interesting stuff with a single message lesson. It sends the user 3 lessons a day. The topic can vary between any topic.
7. Programming Teacher - A bot to teach programming. It has a list of courses it can teach the user each day, with 3 lessons a day.
8. Quizzy - A bot to send the user a daily trivia quiz. The user can answer the questions and get a score, and also get explanations from the bot about the questions.
9. Cooker - A bot to store all the recipes gathered over the years.

## Bots IDs

| **Bot**             | **Prod ID**                                                                                |
|---------------------|--------------------------------------------------------------------------------------------|
| Announcer           | [@mmps_announcer_bot](https://web.telegram.org/k/#@mmps_announcer_bot)                     |
| Coach               | [@mmps_football_coach_bot](https://web.telegram.org/k/#@mmps_football_coach_bot)           |
| Cooker              | [@mmps_cooker_bot](https://web.telegram.org/k/#@mmps_cooker_bot)           |
| Educator            | [@mmps_educator_bot](https://web.telegram.org/k/#@mmps_educator_bot)                       |
| Quizzy              | [@mmps_quizzy_bot](https://web.telegram.org/k/#@mmps_quizzy_bot)                       |
| Notifier            | [@mmps_notifier_bot](https://web.telegram.org/k/#@mmps_notifier_bot)                       |
| Playgrounds         | [@guzi_playgrounds_bot](https://web.telegram.org/k/#@guzi_playgrounds_bot)                 |
| Programming Teacher | [@mmps_programming_teacher_bot](https://web.telegram.org/k/#@mmps_programming_teacher_bot) |
| Trainer             | [@mmps_trainer_bot](https://web.telegram.org/k/#@mmps_trainer_bot)                         |
| Wolt                | [@guzi_wolt_checker_bot](https://web.telegram.org/k/#@guzi_wolt_checker_bot)               |
| Worldly             | [@@mmps_worldly_bot](https://web.telegram.org/k/#@mmps_worldly_staging_bot)               |

## License
This project is licensed under the MIT License.