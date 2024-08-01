import { Injectable, Optional } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly modulename: string;

  constructor(@Optional() private readonly moduleName: string = 'LoggerModule') {
    this.modulename = this.moduleName
      .split(/[\\\/]/)
      .splice(-2)
      .join('/');
  }

  info(method: string, text: string): void {
    console.log(`${this.modulename} | ${method} | ${text}`);
  }

  error(method: string, text: string): void {
    console.error(`${this.modulename} | ${method} | ${text}`);
  }
}
