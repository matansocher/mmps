import { Injectable, Logger } from '@nestjs/common';
import { SecurityAlert, SecurityAlertLevel, SecurityAlertType } from './types';

@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);

  logAlert(alert: SecurityAlert): void {
    const logMessage = `[${alert.level}] ${alert.type} - User ${alert.chatId}: ${alert.message}`;

    switch (alert.level) {
      case SecurityAlertLevel.CRITICAL:
        this.logger.error(logMessage, {
          alert,
          userMessage: alert.userMessage,
          metadata: alert.metadata,
        });
        break;
      case SecurityAlertLevel.WARNING:
        this.logger.warn(logMessage, {
          alert,
          userMessage: alert.userMessage,
          metadata: alert.metadata,
        });
        break;
      case SecurityAlertLevel.INFO:
      default:
        this.logger.log(logMessage, {
          alert,
          userMessage: alert.userMessage,
          metadata: alert.metadata,
        });
        break;
    }
  }

  createAlert(
    type: SecurityAlertType,
    level: SecurityAlertLevel,
    message: string,
    chatId: number,
    userMessage: string,
    metadata?: Record<string, any>,
  ): SecurityAlert {
    return {
      type,
      level,
      message,
      chatId,
      userMessage,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }
}
