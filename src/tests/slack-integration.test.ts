import { describe, it, expect, vi, beforeEach } from 'vitest';
import { slackService } from '../lib/slack';

// Mock fetch
global.fetch = vi.fn();

describe('Slack Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Slack Notification Service', () => {
    it('should send incident notification successfully', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const notificationData = {
        projectName: 'Test Project',
        issueTitle: 'Database Connection Error',
        issueUrl: 'https://sentry.io/issues/123',
        reportId: 456,
        status: 'completed',
        provider: 'Google Gemini 2.0 Flash',
        hasAudio: true,
        hasBlockchainProof: true,
        algorandTx: 'test-tx-hash',
        audioUrl: 'https://example.com/audio.mp3',
        processingTime: 25,
        costCents: 14
      };

      const result = await slackService.sendIncidentNotification(
        'https://hooks.slack.com/test',
        notificationData
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should handle Slack API errors', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Invalid webhook URL')
      });

      const notificationData = {
        projectName: 'Test Project',
        issueTitle: 'Test Error',
        issueUrl: 'https://sentry.io/issues/123',
        reportId: 456,
        status: 'completed',
        provider: 'Google Gemini',
        hasAudio: false,
        hasBlockchainProof: false
      };

      const result = await slackService.sendIncidentNotification(
        'https://hooks.slack.com/invalid',
        notificationData
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Slack API error: 400');
    });

    it('should format message blocks correctly', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({ ok: true });

      const notificationData = {
        projectName: 'Production App',
        issueTitle: 'Critical Database Error',
        issueUrl: 'https://sentry.io/issues/789',
        reportId: 101,
        status: 'completed',
        provider: 'OpenAI GPT-4o-mini',
        hasAudio: true,
        hasBlockchainProof: true,
        algorandTx: 'ABC123',
        audioUrl: 'https://storage.com/audio.mp3',
        processingTime: 30,
        costCents: 21
      };

      await slackService.sendIncidentNotification(
        'https://hooks.slack.com/test',
        notificationData
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.blocks).toBeDefined();
      expect(body.blocks[0].type).toBe('header');
      expect(body.blocks[0].text.text).toContain('Incident Report Generated');
      
      // Check that project name and status are included
      const fieldsSection = body.blocks.find(block => 
        block.type === 'section' && block.fields
      );
      expect(fieldsSection).toBeDefined();
      
      const projectField = fieldsSection.fields.find(field => 
        field.text.includes('Production App')
      );
      expect(projectField).toBeDefined();
    });

    it('should include action buttons for different features', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({ ok: true });

      const notificationData = {
        projectName: 'Test Project',
        issueTitle: 'Test Error',
        issueUrl: 'https://sentry.io/issues/123',
        reportId: 456,
        status: 'completed',
        provider: 'Claude 3 Haiku',
        hasAudio: true,
        hasBlockchainProof: true,
        algorandTx: 'TX123',
        audioUrl: 'https://audio.com/summary.mp3'
      };

      await slackService.sendIncidentNotification(
        'https://hooks.slack.com/test',
        notificationData
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      const actionsBlock = body.blocks.find(block => block.type === 'actions');
      expect(actionsBlock).toBeDefined();
      expect(actionsBlock.elements).toHaveLength(3); // Sentry, Blockchain, Audio buttons
      
      const sentryButton = actionsBlock.elements.find(el => 
        el.text.text === 'View in Sentry'
      );
      expect(sentryButton.url).toBe('https://sentry.io/issues/123');
      
      const blockchainButton = actionsBlock.elements.find(el => 
        el.text.text === 'Blockchain Proof'
      );
      expect(blockchainButton.url).toContain('explorer.algorand.org');
    });

    it('should send test notification', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await slackService.sendTestNotification(
        'https://hooks.slack.com/test'
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledOnce();
      
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.text).toContain('Test Incident');
    });

    it('should handle network errors', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const notificationData = {
        projectName: 'Test Project',
        issueTitle: 'Test Error',
        issueUrl: 'https://sentry.io/issues/123',
        reportId: 456,
        status: 'completed',
        provider: 'Google Gemini',
        hasAudio: false,
        hasBlockchainProof: false
      };

      const result = await slackService.sendIncidentNotification(
        'https://hooks.slack.com/test',
        notificationData
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});