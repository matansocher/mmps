import { Injectable, Logger } from '@nestjs/common';
import { SecurityMonitoringService } from './security-monitoring.service';
import { PromptInjectionDetector } from './detectors/prompt-injection.detector';
import { ToolAbuseDetector } from './detectors/tool-abuse.detector';
import { DataAccessDetector } from './detectors/data-access.detector';
import { CanaryDetector } from './detectors/canary.detector';
import { HoneypotDetectionResult, SecurityAlert } from './types';

export interface HoneypotAnalysisResult {
  shouldBlock: boolean;
  alerts: SecurityAlert[];
  enhancedPrompt?: string;
}

@Injectable()
export class HoneypotMiddleware {
  private readonly logger = new Logger(HoneypotMiddleware.name);
  private readonly promptInjectionDetector: PromptInjectionDetector;
  private readonly toolAbuseDetector: ToolAbuseDetector;
  private readonly dataAccessDetector: DataAccessDetector;
  private readonly canaryDetector: CanaryDetector;

  constructor(private readonly securityMonitoring: SecurityMonitoringService) {
    this.promptInjectionDetector = new PromptInjectionDetector(securityMonitoring);
    this.toolAbuseDetector = new ToolAbuseDetector(securityMonitoring);
    this.dataAccessDetector = new DataAccessDetector(securityMonitoring);
    this.canaryDetector = new CanaryDetector(securityMonitoring);
  }

  /**
   * Analyze incoming message for security threats
   */
  analyzeMessage(message: string, chatId: number): HoneypotAnalysisResult {
    const allAlerts: SecurityAlert[] = [];

    // Run all detectors
    const promptInjectionResult = this.promptInjectionDetector.detect(message, chatId);
    const toolAbuseResult = this.toolAbuseDetector.detect(message, chatId);
    const dataAccessResult = this.dataAccessDetector.detect(message, chatId);

    // Collect all alerts
    allAlerts.push(...promptInjectionResult.alerts);
    allAlerts.push(...toolAbuseResult.alerts);
    allAlerts.push(...dataAccessResult.alerts);

    // Log all alerts
    allAlerts.forEach((alert) => this.securityMonitoring.logAlert(alert));

    // Determine if request should be blocked (only block critical threats)
    const criticalAlerts = allAlerts.filter((alert) => alert.level === 'CRITICAL');
    const shouldBlock = criticalAlerts.length > 0;

    if (shouldBlock) {
      this.logger.warn(`Blocking potentially malicious request from user ${chatId}: ${criticalAlerts.length} critical alerts`);
    }

    return {
      shouldBlock,
      alerts: allAlerts,
    };
  }

  /**
   * Analyze LLM response for canary token leakage
   */
  analyzeResponse(response: string, chatId: number, userMessage: string): SecurityAlert[] {
    const alerts = this.canaryDetector.detectInResponse(response, chatId, userMessage);

    // Log canary alerts
    alerts.forEach((alert) => this.securityMonitoring.logAlert(alert));

    return alerts;
  }

  /**
   * Get system prompt with embedded canary tokens
   */
  getEnhancedSystemPrompt(basePrompt: string): string {
    return this.canaryDetector.getSystemPromptWithCanaries(basePrompt);
  }

  /**
   * Record tool usage for rate limiting
   */
  recordToolUsage(chatId: number, toolName: string): void {
    this.toolAbuseDetector.recordToolUsage(chatId, toolName);
  }

  /**
   * Check if a user ID is a honeypot
   */
  isHoneypotUser(userId: number): boolean {
    return this.dataAccessDetector.isHoneypotUserId(userId);
  }

  /**
   * Get honeypot user context for testing
   */
  getHoneypotUserContext(userId: number): string {
    return this.canaryDetector.getHoneypotUserContext(userId);
  }

  /**
   * Get all active canary tokens
   */
  getCanaryTokens() {
    return this.canaryDetector.getCanaryTokens();
  }

  /**
   * Get tool usage statistics for a user
   */
  getToolUsageStats(chatId: number) {
    return this.toolAbuseDetector.getToolUsageStats(chatId);
  }
}
