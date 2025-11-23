export class Logger {
  constructor(private context: string) {}

  log(message: string): void {
    console.log(`[${this.context}] | ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.context}] | ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.context}] | ${message}`);
  }

  debug(message: string): void {
    console.debug(`[${this.context}] | ${message}`);
  }
}
