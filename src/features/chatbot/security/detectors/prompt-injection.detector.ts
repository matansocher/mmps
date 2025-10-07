import { SecurityAlertLevel, SecurityAlertType, HoneypotDetectionResult, SecurityAlert } from '../types';
import { SecurityMonitoringService } from '../security-monitoring.service';

export class PromptInjectionDetector {
  private readonly injectionPatterns = [
    // Instruction override attempts
    /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?|rules?)/gi,
    /forget\s+(everything|all|previous|your)\s+(instructions?|prompts?|commands?|rules?)/gi,
    /disregard\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?|rules?)/gi,

    // System prompt extraction
    /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
    /what\s+(is|are)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
    /reveal\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
    /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,
    /output\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)/gi,

    // Role manipulation
    /you\s+are\s+now\s+(a|an|in)\s+(admin|developer|debug|god|root)\s+(mode|user)?/gi,
    /act\s+as\s+(a|an)\s+(admin|developer|debug|god|root)/gi,
    /pretend\s+(you\s+are|to\s+be)\s+(a|an)\s+(admin|developer|debug|god|root)/gi,

    // Delimiter injection
    /\[SYSTEM\]/gi,
    /\[\/SYSTEM\]/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|system\|>/gi,
    /<\|assistant\|>/gi,
    /<\|user\|>/gi,

    // Jailbreak attempts
    /do\s+anything\s+now/gi,
    /DAN\s+mode/gi,
    /evil\s+mode/gi,
    /unrestricted\s+mode/gi,

    // Context manipulation
    /you\s+previously\s+said/gi,
    /remember\s+when\s+(you|I)\s+(said|told)/gi,
    /as\s+we\s+discussed\s+earlier/gi,
  ];

  private readonly canaryTokens = [
    'HONEYPOT_SECRET_KEY_DO_NOT_REVEAL',
    'INTERNAL_DEBUG_TOKEN_12345',
    'SYSTEM_ADMIN_PASSWORD',
  ];

  constructor(private readonly securityMonitoring: SecurityMonitoringService) {}

  detect(message: string, chatId: number): HoneypotDetectionResult {
    const alerts: SecurityAlert[] = [];

    // Check for prompt injection patterns
    for (const pattern of this.injectionPatterns) {
      const matches = message.match(pattern);
      if (matches) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.PROMPT_INJECTION,
          SecurityAlertLevel.WARNING,
          `Detected prompt injection pattern: "${matches[0]}"`,
          chatId,
          message,
          { pattern: pattern.source, match: matches[0] },
        );
        alerts.push(alert);
      }
    }

    // Check for canary token mentions
    for (const canary of this.canaryTokens) {
      if (message.includes(canary)) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.CANARY_TRIGGERED,
          SecurityAlertLevel.CRITICAL,
          `User mentioned canary token: "${canary}"`,
          chatId,
          message,
          { canaryToken: canary },
        );
        alerts.push(alert);
      }
    }

    // Check for suspicious character sequences (encoded injection)
    if (this.containsSuspiciousEncoding(message)) {
      const alert = this.securityMonitoring.createAlert(
        SecurityAlertType.SUSPICIOUS_PATTERN,
        SecurityAlertLevel.INFO,
        'Message contains suspicious encoded patterns',
        chatId,
        message,
      );
      alerts.push(alert);
    }

    return {
      isSuspicious: alerts.length > 0,
      alerts,
    };
  }

  private containsSuspiciousEncoding(message: string): boolean {
    // Check for base64-like patterns
    const base64Pattern = /[A-Za-z0-9+\/]{20,}={0,2}/g;
    // Check for hex encoding
    const hexPattern = /(0x[0-9a-fA-F]{4,}|\\x[0-9a-fA-F]{2})/g;
    // Check for unicode escapes
    const unicodePattern = /\\u[0-9a-fA-F]{4}/g;

    return base64Pattern.test(message) || hexPattern.test(message) || unicodePattern.test(message);
  }

  getCanaryTokens(): string[] {
    return [...this.canaryTokens];
  }
}
