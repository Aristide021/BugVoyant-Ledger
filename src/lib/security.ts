import { supabase } from './supabase';
import { monitoring } from './monitoring';

export interface SecurityConfig {
  enablePIIRedaction: boolean;
  enableContentFiltering: boolean;
  maxReportSize: number;
  allowedDomains: string[];
  rateLimits: {
    reportsPerHour: number;
    reportsPerDay: number;
  };
}

export class SecurityService {
  private static instance: SecurityService;
  private piiPatterns: RegExp[];
  private sensitivePatterns: RegExp[];

  private constructor() {
    // Common PII patterns
    this.piiPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP address
    ];

    // Sensitive information patterns
    this.sensitivePatterns = [
      /(?:password|pwd|pass|secret|key|token|auth)[=:]\s*[^\s\n]+/gi,
      /(?:api[_-]?key|apikey)[=:]\s*[^\s\n]+/gi,
      /(?:access[_-]?token|accesstoken)[=:]\s*[^\s\n]+/gi,
      /(?:private[_-]?key|privatekey)[=:]\s*[^\s\n]+/gi,
      /(?:database[_-]?url|db[_-]?url)[=:]\s*[^\s\n]+/gi,
    ];
  }

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // Redact PII and sensitive information from content
  redactSensitiveContent(content: string, config: SecurityConfig): string {
    if (!config.enablePIIRedaction) {
      return content;
    }

    let redactedContent = content;

    // Redact PII
    this.piiPatterns.forEach(pattern => {
      redactedContent = redactedContent.replace(pattern, '[REDACTED]');
    });

    // Redact sensitive information
    this.sensitivePatterns.forEach(pattern => {
      redactedContent = redactedContent.replace(pattern, (match) => {
        const parts = match.split(/[=:]/);
        return parts.length > 1 ? `${parts[0]}=[REDACTED]` : '[REDACTED]';
      });
    });

    return redactedContent;
  }

  // Validate content size and format
  validateContent(content: string, config: SecurityConfig): { valid: boolean; error?: string } {
    if (content.length > config.maxReportSize) {
      return {
        valid: false,
        error: `Content exceeds maximum size of ${config.maxReportSize} characters`
      };
    }

    // Check for malicious content patterns
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(content)) {
        return {
          valid: false,
          error: 'Content contains potentially malicious code'
        };
      }
    }

    return { valid: true };
  }

  // Check rate limits for user
  async checkRateLimit(
    userId: string,
    config: SecurityConfig
  ): Promise<{ allowed: boolean; error?: string }> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Check hourly limit
      const { data: hourlyReports, error: hourlyError } = await supabase
        .from('reports')
        .select('id, projects!inner(user_id)')
        .eq('projects.user_id', userId)
        .gte('created_at', hourAgo.toISOString());

      if (hourlyError) throw hourlyError;

      if (hourlyReports.length >= config.rateLimits.reportsPerHour) {
        return {
          allowed: false,
          error: `Hourly rate limit exceeded (${config.rateLimits.reportsPerHour} reports/hour)`
        };
      }

      // Check daily limit
      const { data: dailyReports, error: dailyError } = await supabase
        .from('reports')
        .select('id, projects!inner(user_id)')
        .eq('projects.user_id', userId)
        .gte('created_at', dayAgo.toISOString());

      if (dailyError) throw dailyError;

      if (dailyReports.length >= config.rateLimits.reportsPerDay) {
        return {
          allowed: false,
          error: `Daily rate limit exceeded (${config.rateLimits.reportsPerDay} reports/day)`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false, error: 'Rate limit check failed' };
    }
  }

  // Validate webhook source
  validateWebhookSource(
    origin: string,
    userAgent: string,
    config: SecurityConfig
  ): { valid: boolean; error?: string } {
    // Check if origin is from allowed domains
    if (config.allowedDomains.length > 0) {
      const isAllowed = config.allowedDomains.some(domain => 
        origin.includes(domain) || origin.endsWith(domain)
      );

      if (!isAllowed) {
        return {
          valid: false,
          error: `Origin ${origin} not in allowed domains`
        };
      }
    }

    // Basic user agent validation (should be from Sentry)
    if (!userAgent.toLowerCase().includes('sentry')) {
      return {
        valid: false,
        error: 'Invalid user agent for webhook'
      };
    }

    return { valid: true };
  }

  // Log security event
  async logSecurityEvent(
    eventType: 'rate_limit_exceeded' | 'invalid_content' | 'unauthorized_access' | 'pii_detected',
    details: {
      userId?: string;
      projectId?: string;
      ipAddress?: string;
      userAgent?: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      await monitoring.logAuditEvent(
        'SECURITY_EVENT',
        'security_incident',
        undefined,
        undefined,
        {
          event_type: eventType,
          severity: details.severity,
          description: details.description,
          metadata: details.metadata
        },
        {
          userId: details.userId,
          projectId: details.projectId,
          ipAddress: details.ipAddress,
          userAgent: details.userAgent
        }
      );

      // Record security metric
      await monitoring.recordSystemMetric(
        `security.${eventType}`,
        1,
        'counter',
        {
          severity: details.severity,
          user_id: details.userId
        }
      );
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  // Generate security report
  async generateSecurityReport(userId: string, days: number = 30): Promise<any> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: securityEvents, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('action', 'SECURITY_EVENT')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate security metrics
      const eventsByType = securityEvents.reduce((acc, event) => {
        const eventType = event.new_values?.event_type || 'unknown';
        acc[eventType] = (acc[eventType] || 0) + 1;
        return acc;
      }, {});

      const eventsBySeverity = securityEvents.reduce((acc, event) => {
        const severity = event.new_values?.severity || 'unknown';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {});

      return {
        period_days: days,
        total_events: securityEvents.length,
        events_by_type: eventsByType,
        events_by_severity: eventsBySeverity,
        recent_events: securityEvents.slice(0, 10),
        recommendations: this.generateSecurityRecommendations(eventsByType, eventsBySeverity)
      };
    } catch (error) {
      console.error('Error generating security report:', error);
      return null;
    }
  }

  private generateSecurityRecommendations(
    eventsByType: Record<string, number>,
    eventsBySeverity: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    if (eventsByType.rate_limit_exceeded > 5) {
      recommendations.push('Consider implementing request queuing to handle traffic spikes');
    }

    if (eventsByType.pii_detected > 0) {
      recommendations.push('Review PII handling procedures and consider additional redaction rules');
    }

    if (eventsBySeverity.high > 0 || eventsBySeverity.critical > 0) {
      recommendations.push('Review high-severity security events and consider additional monitoring');
    }

    if (eventsByType.unauthorized_access > 0) {
      recommendations.push('Review access controls and authentication mechanisms');
    }

    if (recommendations.length === 0) {
      recommendations.push('Security posture looks good - continue monitoring');
    }

    return recommendations;
  }
}

export const security = SecurityService.getInstance();

// Default security configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enablePIIRedaction: true,
  enableContentFiltering: true,
  maxReportSize: 50000, // 50KB
  allowedDomains: ['sentry.io', 'sentry.com'],
  rateLimits: {
    reportsPerHour: 100,
    reportsPerDay: 500
  }
};