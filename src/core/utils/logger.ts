export class Logger {
  constructor(private context: string) {}

  log(message: string): void {
    console.log(`${new Date().toISOString()} | ${this.context} | ${message}`);
  }

  error(message: string): void {
    console.error(`${new Date().toISOString()} | ${this.context} | ${message}`);
  }

  warn(message: string): void {
    console.warn(`${new Date().toISOString()} | ${this.context} | ${message}`);
  }

  debug(message: string): void {
    console.debug(`${new Date().toISOString()} | ${this.context} | ${message}`);
  }
}
