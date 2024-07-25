import { Injectable } from '@nestjs/common';

@Injectable({})
export class LoggerService {
  private readonly filename: string;

  constructor(moduleName) {
    this.filename = moduleName
      .split(/[\\\/]/)
      .splice(-2)
      .join('/');
  }

  info(method, text) {
    console.log(`${this.filename} | ${method} | ${text}`);
  }

  error(method, text) {
    console.error(`${this.filename} | ${method} | ${text}`);
  }
}
