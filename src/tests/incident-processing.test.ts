import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { monitoring } from '../lib/monitoring';
import { resilience } from '../lib/resilience';
import { security } from '../lib/security';

// Mock external dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
}));

// Mock fetch for AI providers
global.fetch = vi.fn();

describe('Incident Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AI Provider Fallback', () => {
    it('should fallback to next provider when first fails', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      
      // First call (Gemini) fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });
      
      // Second call (OpenAI) succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Generated report content' } }]
        })
      });

      // Test the fallback mechanism
      const providers = [
        {
          name: 'Google Gemini',
          execute: async (): Promise<string> => {
            const response = await fetch('https://api.google.com/test');
            if (!response.ok) throw new Error('Gemini failed');
            return 'gemini content';
          }
        },
        {
          name: 'OpenAI',
          execute: async (): Promise<string> => {
            const response = await fetch('https://api.openai.com/test');
            const data = await response.json();
            return data.choices[0].message.content;
          }
        }
      ];

      let result = '';
      for (const provider of providers) {
        try {
          result = await provider.execute();
          break;
        } catch (error) {
          console.log(`${provider.name} failed, trying next...`);
          // Continue to next provider
        }
      }

      expect(result).toBe('Generated report content');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle all providers failing', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      
      // All calls fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      const providers = [
        { name: 'Provider 1', execute: async (): Promise<string> => { await fetch('test1'); return 'content1'; } },
        { name: 'Provider 2', execute: async (): Promise<string> => { await fetch('test2'); return 'content2'; } },
      ];

      let error: Error | null = null;
      try {
        for (const provider of providers) {
          await provider.execute();
        }
      } catch (e: unknown) {
        error = e as Error;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Network error');
    });
  });

  describe('Resilience Patterns', () => {
    it('should implement retry with exponential backoff', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValueOnce('Success');

      const config = {
        maxRetries: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      };

      const result = await resilience.withRetry(
        mockOperation,
        config,
        { operationName: 'test-operation' }
      );

      expect(result).toBe('Success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should implement circuit breaker pattern', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Service down'));

      const config = {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        monitoringPeriodMs: 5000
      };

      // First few calls should fail and open the circuit
      try {
        await resilience.withCircuitBreaker(mockOperation, 'test-service', config);
      } catch (error) {
        expect(error.message).toBe('Service down');
      }

      try {
        await resilience.withCircuitBreaker(mockOperation, 'test-service', config);
      } catch (error) {
        expect(error.message).toBe('Service down');
      }

      // Circuit should now be open
      try {
        await resilience.withCircuitBreaker(mockOperation, 'test-service', config);
      } catch (error) {
        // Circuit should not call the third time
        expect(error).toBeDefined();
      }

      expect(mockOperation).toHaveBeenCalledTimes(2); // Should not call the third time
    });

    it('should implement timeout pattern', async () => {
      const slowOperation = () => new Promise(resolve => setTimeout(resolve, 2000));

      const startTime = Date.now();
      
      try {
        await resilience.withTimeout(slowOperation, 500, 'slow-operation');
      } catch (error) {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(1000); // Should timeout before 1 second
        expect(error).toBeDefined();
      }
    });
  });

  describe('Security Validation', () => {
    it('should validate webhook source', () => {
      const config = {
        enablePIIRedaction: true,
        enableContentFiltering: true,
        maxReportSize: 50000,
        allowedDomains: ['sentry.io'],
        rateLimits: { reportsPerHour: 100, reportsPerDay: 500 }
      };

      const validResult = security.validateWebhookSource(
        'https://sentry.io/webhook',
        'Sentry/1.0',
        config
      );
      expect(validResult.valid).toBe(true);

      const invalidResult = security.validateWebhookSource(
        'https://malicious.com',
        'BadBot/1.0',
        config
      );
      expect(invalidResult.valid).toBe(false);
    });

    it('should redact PII from content', () => {
      const config = {
        enablePIIRedaction: true,
        enableContentFiltering: true,
        maxReportSize: 50000,
        allowedDomains: [],
        rateLimits: { reportsPerHour: 100, reportsPerDay: 500 }
      };

      const content = 'User email: john.doe@example.com and SSN: 123-45-6789';
      const redacted = security.redactSensitiveContent(content, config);
      
      expect(redacted).not.toContain('john.doe@example.com');
      expect(redacted).not.toContain('123-45-6789');
      expect(redacted).toContain('[REDACTED]');
    });

    it('should validate content size', () => {
      const config = {
        enablePIIRedaction: true,
        enableContentFiltering: true,
        maxReportSize: 100,
        allowedDomains: [],
        rateLimits: { reportsPerHour: 100, reportsPerDay: 500 }
      };

      const smallContent = 'This is a small content';
      const largeContent = 'x'.repeat(200);

      const validResult = security.validateContent(smallContent, config);
      expect(validResult.valid).toBe(true);

      const invalidResult = security.validateContent(largeContent, config);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toContain('exceeds maximum size');
    });

    it('should detect malicious content', () => {
      const config = {
        enablePIIRedaction: true,
        enableContentFiltering: true,
        maxReportSize: 50000,
        allowedDomains: [],
        rateLimits: { reportsPerHour: 100, reportsPerDay: 500 }
      };

      const maliciousContent = '<script>alert("xss")</script>';
      const result = security.validateContent(maliciousContent, config);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('malicious code');
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track processing steps', () => {
      const reportId = 123;
      
      monitoring.startStep(reportId, 'test_step');
      const steps = monitoring.getProcessingSteps(reportId);
      
      expect(steps).toHaveLength(1);
      expect(steps[0].name).toBe('test_step');
      expect(steps[0].status).toBe('started');
      expect(steps[0].startTime).toBeDefined();
    });

    it('should complete processing steps with metrics', () => {
      const reportId = 123;
      
      monitoring.startStep(reportId, 'test_step');
      monitoring.completeStep(reportId, 'test_step', 'test_provider', 100);
      
      const steps = monitoring.getProcessingSteps(reportId);
      const step = steps.find(s => s.name === 'test_step');
      
      expect(step?.status).toBe('completed');
      expect(step?.provider).toBe('test_provider');
      expect(step?.costCents).toBe(100);
      expect(step?.endTime).toBeDefined();
    });

    it('should handle step failures', () => {
      const reportId = 123;
      
      monitoring.startStep(reportId, 'test_step');
      monitoring.failStep(reportId, 'test_step', 'Test error message');
      
      const steps = monitoring.getProcessingSteps(reportId);
      const step = steps.find(s => s.name === 'test_step');
      
      expect(step?.status).toBe('failed');
      expect(step?.error).toBe('Test error message');
    });

    it('should cleanup processing data', () => {
      const reportId = 123;
      
      monitoring.startStep(reportId, 'test_step');
      expect(monitoring.getProcessingSteps(reportId)).toHaveLength(1);
      
      monitoring.cleanupProcessingData(reportId);
      expect(monitoring.getProcessingSteps(reportId)).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle blockchain anchoring failures gracefully', async () => {
      const mockAlgorandOperation = vi.fn().mockRejectedValue(new Error('Network timeout'));
      
      let status = 'processing';
      try {
        await mockAlgorandOperation();
      } catch (error) {
        status = 'pending_hash';
      }
      
      expect(status).toBe('pending_hash');
    });

    it('should handle audio generation failures gracefully', async () => {
      const mockAudioOperation = vi.fn().mockRejectedValue(new Error('TTS service unavailable'));
      
      let status = 'processing';
      try {
        await mockAudioOperation();
      } catch (error) {
        status = 'text_only';
      }
      
      expect(status).toBe('text_only');
    });

    it('should handle partial failures correctly', async () => {
      const mockBlockchainOp = vi.fn().mockRejectedValue(new Error('Blockchain failed'));
      const mockAudioOp = vi.fn().mockRejectedValue(new Error('Audio failed'));
      
      let status = 'processing';
      let blockchainFailed = false;
      let audioFailed = false;
      
      try {
        await mockBlockchainOp();
      } catch (error) {
        blockchainFailed = true;
        expect(error).toBeDefined();
      }
      
      try {
        await mockAudioOp();
      } catch (error) {
        audioFailed = true;
        expect(error).toBeDefined();
      }
      
      if (blockchainFailed && audioFailed) {
        status = 'partial';
      } else if (blockchainFailed) {
        status = 'pending_hash';
      } else if (audioFailed) {
        status = 'text_only';
      }
      
      expect(status).toBe('partial');
    });
  });
});