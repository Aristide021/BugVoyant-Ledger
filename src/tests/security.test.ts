import { describe, it, expect, beforeEach } from 'vitest';
import { security, DEFAULT_SECURITY_CONFIG } from '../lib/security';

describe('Security Service', () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe('PII Redaction', () => {
    it('should redact email addresses', () => {
      const content = 'Contact user at john.doe@example.com for details';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).not.toContain('john.doe@example.com');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact SSN numbers', () => {
      const content = 'User SSN: 123-45-6789';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).not.toContain('123-45-6789');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact credit card numbers', () => {
      const content = 'Card number: 4532 1234 5678 9012';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).not.toContain('4532 1234 5678 9012');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact phone numbers', () => {
      const content = 'Call us at 555-123-4567';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).not.toContain('555-123-4567');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact IP addresses', () => {
      const content = 'Server IP: 192.168.1.100';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).not.toContain('192.168.1.100');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should redact API keys and tokens', () => {
      const content = 'API_KEY=sk_test_1234567890abcdef and password=secret123';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).not.toContain('sk_test_1234567890abcdef');
      expect(redacted).not.toContain('secret123');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should preserve non-sensitive content', () => {
      const content = 'This is a normal error message without sensitive data';
      const redacted = security.redactSensitiveContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(redacted).toBe(content);
    });
  });

  describe('Content Validation', () => {
    it('should accept valid content', () => {
      const content = 'This is a normal error report';
      const result = security.validateContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject content exceeding size limit', () => {
      const content = 'x'.repeat(DEFAULT_SECURITY_CONFIG.maxReportSize + 1);
      const result = security.validateContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should detect script injection attempts', () => {
      const content = '<script>alert("xss")</script>';
      const result = security.validateContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious code');
    });

    it('should detect javascript: URLs', () => {
      const content = 'Click here: javascript:alert("xss")';
      const result = security.validateContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious code');
    });

    it('should detect data URLs with HTML', () => {
      const content = 'Image: data:text/html,<script>alert(1)</script>';
      const result = security.validateContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious code');
    });

    it('should detect VBScript attempts', () => {
      const content = 'vbscript:msgbox("xss")';
      const result = security.validateContent(content, DEFAULT_SECURITY_CONFIG);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious code');
    });
  });

  describe('Webhook Source Validation', () => {
    it('should accept requests from allowed domains', () => {
      const result = security.validateWebhookSource(
        'https://sentry.io/webhook',
        'Sentry/1.0',
        DEFAULT_SECURITY_CONFIG
      );
      
      expect(result.valid).toBe(true);
    });

    it('should reject requests from disallowed domains', () => {
      const result = security.validateWebhookSource(
        'https://malicious.com/webhook',
        'Sentry/1.0',
        DEFAULT_SECURITY_CONFIG
      );
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in allowed domains');
    });

    it('should reject requests with invalid user agents', () => {
      const result = security.validateWebhookSource(
        'https://sentry.io/webhook',
        'BadBot/1.0',
        DEFAULT_SECURITY_CONFIG
      );
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid user agent');
    });

    it('should accept requests with Sentry user agent', () => {
      const result = security.validateWebhookSource(
        'https://sentry.io/webhook',
        'Sentry-Webhook/1.0',
        DEFAULT_SECURITY_CONFIG
      );
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events without throwing', async () => {
      // This test ensures the logging function doesn't throw errors
      await expect(
        security.logSecurityEvent('unauthorized_access', {
          severity: 'high',
          description: 'Test security event',
          ipAddress: '192.168.1.1',
          userAgent: 'TestAgent/1.0'
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Security Configuration', () => {
    it('should have sensible default configuration', () => {
      expect(DEFAULT_SECURITY_CONFIG.enablePIIRedaction).toBe(true);
      expect(DEFAULT_SECURITY_CONFIG.enableContentFiltering).toBe(true);
      expect(DEFAULT_SECURITY_CONFIG.maxReportSize).toBeGreaterThan(0);
      expect(DEFAULT_SECURITY_CONFIG.allowedDomains).toContain('sentry.io');
      expect(DEFAULT_SECURITY_CONFIG.rateLimits.reportsPerHour).toBeGreaterThan(0);
      expect(DEFAULT_SECURITY_CONFIG.rateLimits.reportsPerDay).toBeGreaterThan(0);
    });

    it('should allow disabling PII redaction', () => {
      const config = {
        ...DEFAULT_SECURITY_CONFIG,
        enablePIIRedaction: false
      };

      const content = 'Email: test@example.com';
      const redacted = security.redactSensitiveContent(content, config);
      
      expect(redacted).toBe(content); // Should not be redacted
    });
  });
});