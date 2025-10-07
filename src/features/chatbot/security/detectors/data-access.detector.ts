import { SecurityAlertLevel, SecurityAlertType, HoneypotDetectionResult, SecurityAlert } from '../types';
import { SecurityMonitoringService } from '../security-monitoring.service';

export class DataAccessDetector {
  // Honeypot user IDs that should never be accessed
  private readonly honeypotUserIds = [-999, -1000, 999999];

  // Patterns for path traversal attempts
  private readonly pathTraversalPatterns = [
    /\.\.[\/\\]/g, // ../
    /[\/\\]etc[\/\\]passwd/gi,
    /[\/\\]etc[\/\\]shadow/gi,
    /\.\.%2[fF]/g, // URL encoded ../
    /%252[eE]%252[eE]%252[fF]/g, // Double encoded ../
    /\.\.[\/\\]\.\./ g,
  ];

  // Patterns for sensitive file access
  private readonly sensitiveFilePatterns = [
    /\.env/gi,
    /config\.json/gi,
    /secrets?\.json/gi,
    /credentials?\.json/gi,
    /private[_-]?key/gi,
    /\.pem$/gi,
    /\.key$/gi,
    /\.ssh[\/\\]/gi,
    /id_rsa/gi,
    /\.aws[\/\\]credentials/gi,
  ];

  // Patterns for internal/local network access
  private readonly maliciousUrlPatterns = [
    /localhost/gi,
    /127\.0\.0\.1/g,
    /0\.0\.0\.0/g,
    /10\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, // 10.x.x.x
    /172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}/g, // 172.16.x.x - 172.31.x.x
    /192\.168\.\d{1,3}\.\d{1,3}/g, // 192.168.x.x
    /169\.254\.\d{1,3}\.\d{1,3}/g, // Link-local 169.254.x.x
  ];

  constructor(private readonly securityMonitoring: SecurityMonitoringService) {}

  detect(message: string, chatId: number): HoneypotDetectionResult {
    const alerts: SecurityAlert[] = [];

    // Check for honeypot user ID access attempts
    for (const honeypotId of this.honeypotUserIds) {
      if (message.includes(honeypotId.toString())) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.DATA_ACCESS_VIOLATION,
          SecurityAlertLevel.CRITICAL,
          `User attempted to access honeypot user ID: ${honeypotId}`,
          chatId,
          message,
          { honeypotUserId: honeypotId },
        );
        alerts.push(alert);
      }
    }

    // Check for path traversal attempts
    for (const pattern of this.pathTraversalPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.PATH_TRAVERSAL,
          SecurityAlertLevel.CRITICAL,
          `Detected path traversal attempt: "${matches[0]}"`,
          chatId,
          message,
          { pattern: pattern.source, match: matches[0] },
        );
        alerts.push(alert);
      }
    }

    // Check for sensitive file access attempts
    for (const pattern of this.sensitiveFilePatterns) {
      const matches = message.match(pattern);
      if (matches) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.DATA_ACCESS_VIOLATION,
          SecurityAlertLevel.WARNING,
          `User mentioned sensitive file pattern: "${matches[0]}"`,
          chatId,
          message,
          { pattern: pattern.source, match: matches[0] },
        );
        alerts.push(alert);
      }
    }

    // Check for malicious URL patterns (internal network)
    for (const pattern of this.maliciousUrlPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.MALICIOUS_URL,
          SecurityAlertLevel.WARNING,
          `Detected potential internal network URL: "${matches[0]}"`,
          chatId,
          message,
          { pattern: pattern.source, match: matches[0] },
        );
        alerts.push(alert);
      }
    }

    // Check for cross-user data access attempts
    const crossUserAttempts = this.detectCrossUserAccess(message, chatId);
    alerts.push(...crossUserAttempts);

    return {
      isSuspicious: alerts.length > 0,
      alerts,
    };
  }

  private detectCrossUserAccess(message: string, chatId: number): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];

    // Patterns suggesting cross-user access attempts
    const crossUserPatterns = [
      /user\s+id[:\s]+\d+/gi,
      /chat\s+id[:\s]+\d+/gi,
      /other\s+user'?s?\s+(data|calendar|exercise|history)/gi,
      /everyone'?s?\s+(data|calendar|exercise|history)/gi,
      /all\s+users?/gi,
    ];

    for (const pattern of crossUserPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        // Extract mentioned user IDs
        const mentionedIds = message.match(/\d+/g)?.map(Number) || [];

        // Check if user is trying to access another user's data
        const otherUserIds = mentionedIds.filter((id) => id !== chatId && id > 0 && id < 1000000000);

        if (otherUserIds.length > 0) {
          const alert = this.securityMonitoring.createAlert(
            SecurityAlertType.DATA_ACCESS_VIOLATION,
            SecurityAlertLevel.WARNING,
            `User may be attempting to access other user data: ${otherUserIds.join(', ')}`,
            chatId,
            message,
            { mentionedUserIds: otherUserIds },
          );
          alerts.push(alert);
        }
      }
    }

    return alerts;
  }

  isHoneypotUserId(userId: number): boolean {
    return this.honeypotUserIds.includes(userId);
  }

  getHoneypotUserIds(): number[] {
    return [...this.honeypotUserIds];
  }
}
