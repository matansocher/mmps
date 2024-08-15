import { Injectable, Optional } from '@nestjs/common';

@Injectable()
export class LoggerService {
  readonly filename: string;

  constructor(@Optional() private readonly moduleName: string = 'LoggerModule') {
    this.filename = this.moduleName
      .split(/[\\\/]/)
      .splice(-2)
      .join('/');
  }

  info(method: string, text: string): void {
    console.log(`${this.filename} | ${method} | ${text}`);
  }

  error(method: string, text: string): void {
    console.error(`${this.filename} | ${method} | ${text}`);
  }
}
