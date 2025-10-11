export enum SecurityAlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum SecurityAlertType {
  PROMPT_INJECTION = 'PROMPT_INJECTION',
  TOOL_ABUSE = 'TOOL_ABUSE',
  DATA_ACCESS_VIOLATION = 'DATA_ACCESS_VIOLATION',
  CANARY_TRIGGERED = 'CANARY_TRIGGERED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_PATTERN = 'SUSPICIOUS_PATTERN',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  MALICIOUS_URL = 'MALICIOUS_URL',
}

export interface SecurityAlert {
  type: SecurityAlertType;
  level: SecurityAlertLevel;
  message: string;
  chatId: number;
  userMessage: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface HoneypotDetectionResult {
  isSuspicious: boolean;
  alerts: SecurityAlert[];
}
