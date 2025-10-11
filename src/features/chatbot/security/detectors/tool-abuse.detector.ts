import { SecurityAlertLevel, SecurityAlertType, HoneypotDetectionResult, SecurityAlert } from '../types';
import { SecurityMonitoringService } from '../security-monitoring.service';

interface ToolUsageRecord {
  count: number;
  lastReset: number;
  recentTools: string[];
}

export class ToolAbuseDetector {
  private readonly userToolUsage = new Map<number, ToolUsageRecord>();

  // Rate limits per hour
  private readonly rateLimits = {
    imageGeneration: 10,
    textToSpeech: 20,
    cryptoQueries: 50,
    stockQueries: 50,
    totalTools: 100,
  };

  // Expensive tools that should be monitored
  private readonly expensiveTools = [
    'image_generator',
    'text_to_speech',
    'image_generator_prompt_enhancer',
    'audio_transcriber',
    'google_maps_place',
  ];

  constructor(private readonly securityMonitoring: SecurityMonitoringService) {}

  detect(message: string, chatId: number): HoneypotDetectionResult {
    const alerts: SecurityAlert[] = [];

    // Check for rapid tool call requests
    const usage = this.getUserUsage(chatId);
    usage.count += 1;

    // Check for rate limit violations
    if (usage.count > this.rateLimits.totalTools) {
      const alert = this.securityMonitoring.createAlert(
        SecurityAlertType.RATE_LIMIT_EXCEEDED,
        SecurityAlertLevel.WARNING,
        `User exceeded tool usage rate limit: ${usage.count} calls in the last hour`,
        chatId,
        message,
        { toolCount: usage.count, limit: this.rateLimits.totalTools },
      );
      alerts.push(alert);
    }

    // Check for suspicious patterns in messages
    const suspiciousPatterns = this.detectSuspiciousToolPatterns(message, chatId);
    alerts.push(...suspiciousPatterns);

    // Check for repeated identical requests (potential automated abuse)
    if (this.isRepeatedRequest(message, usage)) {
      const alert = this.securityMonitoring.createAlert(
        SecurityAlertType.TOOL_ABUSE,
        SecurityAlertLevel.INFO,
        'User is making repeated identical requests',
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

  recordToolUsage(chatId: number, toolName: string): void {
    const usage = this.getUserUsage(chatId);
    usage.recentTools.push(toolName);

    // Keep only last 50 tool calls
    if (usage.recentTools.length > 50) {
      usage.recentTools.shift();
    }
  }

  private getUserUsage(chatId: number): ToolUsageRecord {
    const now = Date.now();
    const existing = this.userToolUsage.get(chatId);

    // Reset counter every hour
    if (!existing || now - existing.lastReset > 3600000) {
      const newRecord: ToolUsageRecord = {
        count: 0,
        lastReset: now,
        recentTools: [],
      };
      this.userToolUsage.set(chatId, newRecord);
      return newRecord;
    }

    return existing;
  }

  private detectSuspiciousToolPatterns(message: string, chatId: number): SecurityAlert[] {
    const alerts: SecurityAlert[] = [];

    // Check for attempts to call multiple expensive tools rapidly
    const expensiveToolMentions = this.expensiveTools.filter((tool) => message.toLowerCase().includes(tool.replace(/_/g, ' ')));

    if (expensiveToolMentions.length >= 3) {
      const alert = this.securityMonitoring.createAlert(
        SecurityAlertType.TOOL_ABUSE,
        SecurityAlertLevel.WARNING,
        `User requesting multiple expensive tools simultaneously: ${expensiveToolMentions.join(', ')}`,
        chatId,
        message,
        { tools: expensiveToolMentions },
      );
      alerts.push(alert);
    }

    // Check for loop-like patterns
    const loopPatterns = [/for\s+\d+\s+times/gi, /repeat\s+\d+\s+times/gi, /do\s+this\s+\d+\s+times/gi, /\d+\s+times/gi];

    for (const pattern of loopPatterns) {
      if (pattern.test(message)) {
        const alert = this.securityMonitoring.createAlert(
          SecurityAlertType.SUSPICIOUS_PATTERN,
          SecurityAlertLevel.INFO,
          'User requesting repeated operations',
          chatId,
          message,
        );
        alerts.push(alert);
        break;
      }
    }

    return alerts;
  }

  private isRepeatedRequest(message: string, usage: ToolUsageRecord): boolean {
    const recentMessages = usage.recentTools.slice(-5);
    const identicalCount = recentMessages.filter((msg) => msg === message).length;
    return identicalCount >= 3;
  }

  getToolUsageStats(chatId: number): ToolUsageRecord | undefined {
    return this.userToolUsage.get(chatId);
  }
}
