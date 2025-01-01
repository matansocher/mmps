import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { LoggerService } from '@core/logger';
import { MY_USER_ID } from '@core/notifier-bot/notifier-bot.config';
import { UtilsService } from '@core/utils';
import { TeacherService } from '@services/teacher';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { HOUR_OF_DAY_FIRST_LESSON, HOURS_OF_DAY_ADDITIONAL_LESSONS } from './teacher-bot.config';

@Injectable()
export class TeacherSchedulerService {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly teacherService: TeacherService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.PROGRAMMING_TEACHER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(`0 ${HOUR_OF_DAY_FIRST_LESSON} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleLessonFirstPart(): Promise<void> {
    try {
      await this.teacherService.lessonFirstPart();
    } catch (err) {
      this.logger.error(this.handleLessonFirstPart.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `Error in first lesson: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  @Cron(`0 ${HOURS_OF_DAY_ADDITIONAL_LESSONS.join(',')} * * *`, { name: 'teacher-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleLessonNextPart(): Promise<void> {
    try {
      await this.teacherService.lessonNextPart();
    } catch (err) {
      this.logger.error(this.handleLessonNextPart.name, `error: ${this.utilsService.getErrorMessage(err)}`);
      this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, `Error in lesson part: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  async testMarkup(): Promise<void> {
    try {
      const response = `Great choice! The topic of "Advanced JavaScript: Event Loop and Async/Await" is essential for mastering asynchronous programming in JavaScript. Today, we’ll break it down into three parts:

### Part 1: Understanding the Event Loop

**1. The Basics of JavaScript Execution:**
   - JavaScript is single-threaded, which means it can execute one command at a time. This is crucial to understand the event loop.
   - When you run JavaScript in a browser or on Node.js, it operates in an execution context called the "call stack".

**2. The Call Stack:**
   - Think of the call stack as a stack of plates. When a function is called, it's like putting a plate on the top of the stack. Once the function completes, the plate is removed from the top.
   - If a function calls another function, the new function is placed on top until it finishes executing.

   \`\`\`javascript
   class Animal {
       constructor(name) {
           this.name = name;
       }
       speak() {
           console.log('dog speaks');
       }
   }

   const dog = new Animal("Dog");
   dog.speak(); // Dog speaks
   \`\`\`

**3. Web APIs and the Event Loop:**
   - To handle tasks that take time (like network requests), JavaScript uses Web APIs (in browsers) or the Event Loop (in Node.js).
   - When an asynchronous operation is initiated (e.g., fetching data), it’s handed off to the browser or Node.js, allowing JavaScript to continue executing subsequent code.

**4. The Event Queue:**
   - Once the asynchronous operation completes, it doesn’t execute immediately; instead, it is pushed into the event queue.
   - The event loop constantly checks if the call stack is empty. If it is, it will take the first function from the event queue and push it onto the call stack.

**5. Real-world Analogy:**
   - Imagine a restaurant kitchen (the call stack) that can only prepare one dish at a time. When an order (an async task) comes in, the chef (JavaScript) passes that order to the prep cook (Web API), who works on it while the chef continues preparing other dishes. Once the prep cook is done, they place the completed dish (callback) in a holding area (event queue) for the chef to pick up once they’re free.

### Reflection:
- Take a moment to think about how synchronous and asynchronous code execution differs in JavaScript, along with the roles of the call stack, event queue, and Web APIs.
- Do you need any clarification on the concepts discussed in Part 1 before we proceed to Part 2, where we will explore promises in more detail?`;
      const escapedResponse1 = response.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
      const escapedResponse = `hello!`;
      await this.telegramGeneralService.sendMessage(this.bot, MY_USER_ID, response, { parse_mode: 'Markdown' });
    } catch (err) {
      this.logger.error(this.testMarkup.name, `error: ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
