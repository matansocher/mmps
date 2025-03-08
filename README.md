# NestJS Telegram Bots

This repository contains a NestJS application that hosts multiple Telegram bots. Each bot is designed to handle specific tasks and interact with users through Telegram.

## Table of Contents
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Bots](#available-bots)
- [Running the Application](#running-the-application)
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
    GEMINI_API_KEY=

    MONGO_DB_URL=
   ```


## Running the Application
To start the NestJS application:

   ```bash
    npm run start:debug
   ```

## Available Bots
1. Playgrounds - A dev only bot to test telegram stuff
2. Wolt - A bot to notify the user when a Wolt restaurant is open and available to get orders
3. Voice Pal - A bot to help the user with transcriptions, translation and images
4. Coach - A bot to show the user a daily list of sports games
5. Trainer - A bot to encourage the user the train every day with nice rewards for records.
6. Educator - A bot to teach the user of interesting stuff with a single message lesson. It sends the user 3 lessons a day. The topic can vary between any topic.
7. Programming Teacher - A bot to teach programming. It has a list of courses it can teach the user each day,  with 3 lessons a day.
8. Rollinspark - A bot to notify when it finds a new apartment details uploaded to the Rollinspark neighborhood in Maryland

## Bots IDs

| **#** | **Bot**             | **Prod ID**                                                                                | **Testing ID**                                                                                     |
|-------|---------------------|--------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| 1     | Notifier            | [@mmps_notifier_bot](https://web.telegram.org/k/#@mmps_notifier_bot)                       | [@mmps_notifier_staging_bot](https://web.telegram.org/k/#@mmps_notifier_staging_bot)               |
| 2     | Playgrounds         | [@guzi_playgrounds_bot](https://web.telegram.org/k/#@guzi_playgrounds_bot)                 | -                                                                                                  |
| 3     | Wolt                | [@guzi_wolt_checker_bot](https://web.telegram.org/k/#@guzi_wolt_checker_bot)               | [@wolt_testing_bot](https://web.telegram.org/k/#@wolt_testing_bot)                                 |
| 4     | Voice Pal           | [@voice_pal_bot](https://web.telegram.org/k/#@voice_pal_bot)                               | [@voice_pal_staging_bot](https://web.telegram.org/k/#@voice_pal_staging_bot)                       |
| 5     | Coach               | [@mmps_football_coach_bot](https://web.telegram.org/k/#@mmps_football_coach_bot)           | [@mmps_football_coach_staging_bot](https://web.telegram.org/k/#@mmps_football_coach_staging_bot)   |
| 6     | Trainer             | [@mmps_trainer_bot](https://web.telegram.org/k/#@mmps_trainer_bot)                         | [@mmps_trainer_stg_bot](https://web.telegram.org/k/#@mmps_trainer_stg_bot)                         |
| 7     | Educator            | [@mmps_educator_bot](https://web.telegram.org/k/#@mmps_educator_bot)                       | [@mmps_educator_stg_bot](https://web.telegram.org/k/#@mmps_educator_stg_bot)                       |
| 8     | Programming Teacher | [@mmps_programming_teacher_bot](https://web.telegram.org/k/#@mmps_programming_teacher_bot) | [@mmps_programming_teacher_stg_bot](https://web.telegram.org/k/#@mmps_programming_teacher_stg_bot) |
| 9     | Rollinspark         | [@mmps_rollinspark_bot](https://web.telegram.org/k/#@mmps_rollinspark_bot)                 | [@mmps_rollinspark_staging_bot](https://web.telegram.org/k/#@mmps_rollinspark_staging_bot)         |

## License
This project is licensed under the MIT License.