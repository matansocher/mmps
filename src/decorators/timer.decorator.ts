export function Timer(): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = this.logger;
      if (!logger) {
        throw new Error('LoggerService is not injected');
      }

      const start = Date.now();

      const result = await originalMethod.apply(this, args);

      const end = Date.now();
      const executionTime = end - start;
      logger.info(String(propertyKey), `Execution time: ${executionTime}ms`);

      return result;
    };

    return descriptor;
  };
}