import { InternalServerErrorException, Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly filename: string;
  private readonly moduleName = 'LoggerService';

  constructor() {
    if (!this.moduleName) {
      throw new InternalServerErrorException('LoggerService must be provided with a moduleName');
    }

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
