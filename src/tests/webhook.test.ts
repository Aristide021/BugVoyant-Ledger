import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../../netlify/functions/enhanced-report';

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [{ id: 'test-project', name: 'Test Project', user_id: 'test-user' }],
            error: null
          }))
        }))
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: { id: 1, status: 'processing' },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }))
}));

vi.mock('algosdk', () => ({
  default: {
    mnemonicToSecretKey: vi.fn(() => ({ addr: 'test-addr', sk: new Uint8Array(64) })),
    makePaymentTxnWithSuggestedParamsFromObject: vi.fn(() => ({ signTxn: vi.fn() })),
    waitForConfirmation: vi.fn(() => Promise.resolve()),
    Algodv2: vi.fn(() => ({
      getTransactionParams: vi.fn(() => ({ do: vi.fn(() => Promise.resolve({})) })),
      sendRawTransaction: vi.fn(() => ({ do: vi.fn(() => Promise.resolve({ txId: 'test-tx' })) }))
    }))
  }
}));

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
    }
  }
});

describe('Enhanced Report Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.SENTRY_WEBHOOK_SECRET = 'test-secret';
    process.env.GOOGLE_API_KEY = 'test-google-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.ELEVEN_API_KEY = 'test-eleven-key';
    process.env.ALGORAND_MNEMONIC = 'test mnemonic with twenty five words for algorand account creation and testing purposes only do not use in production';
  });

  it('should reject non-POST requests', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {},
      body: null
    };

    const response = await handler(event as any);

    expect(response.statusCode).toBe(405);
    expect(JSON.parse(response.body)).toEqual({ error: 'Method not allowed' });
  });

  it('should reject requests without webhook signature', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ test: 'data' })
    };

    const response = await handler(event as any);

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: 'Missing signature' });
  });

  it('should process valid Sentry webhook', async () => {
    const sentryPayload = {
      action: 'created',
      data: {
        issue: {
          id: 'test-issue-123',
          title: 'Test Error: Something went wrong',
          culprit: 'test.js',
          level: 'error',
          status: 'unresolved',
          statusDetails: {},
          type: 'error',
          metadata: {},
          numComments: 0,
          assignedTo: null,
          permalink: 'https://sentry.io/issues/123',
          firstSeen: '2025-01-01T00:00:00Z',
          lastSeen: '2025-01-01T00:00:00Z',
          count: '1',
          userCount: 1,
          project: {
            id: 'test-project',
            name: 'Test Project',
            slug: 'test-project'
          }
        }
      },
      installation: {
        uuid: 'test-installation'
      }
    };

    const body = JSON.stringify(sentryPayload);
    
    // Mock crypto.createHmac for signature verification
    const mockHmac = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('valid-signature')
    };
    
    vi.doMock('crypto', () => ({
      createHmac: vi.fn(() => mockHmac)
    }));

    const event = {
      httpMethod: 'POST',
      headers: {
        'x-sentry-hook-signature': 'valid-signature',
        'x-forwarded-for': '127.0.0.1',
        'user-agent': 'Sentry/1.0'
      },
      body
    };

    const response = await handler(event as any);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.message).toBe('Webhook received, processing incident');
    expect(responseBody.reportId).toBeDefined();
  });

  it('should ignore non-issue events', async () => {
    const sentryPayload = {
      action: 'updated',
      data: {
        issue: {
          id: 'test-issue-123',
          title: 'Test Error'
        }
      }
    };

    const body = JSON.stringify(sentryPayload);
    
    const mockHmac = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('valid-signature')
    };
    
    vi.doMock('crypto', () => ({
      createHmac: vi.fn(() => mockHmac)
    }));

    const event = {
      httpMethod: 'POST',
      headers: {
        'x-sentry-hook-signature': 'valid-signature'
      },
      body
    };

    const response = await handler(event as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ message: 'Event ignored' });
  });

  it('should handle database errors gracefully', async () => {
    // Mock Supabase to return an error
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({
                data: null,
                error: { message: 'Database connection failed' }
              }))
            }))
          }))
        }))
      }))
    }));

    const sentryPayload = {
      action: 'created',
      data: {
        issue: {
          id: 'test-issue-123',
          title: 'Test Error'
        }
      }
    };

    const body = JSON.stringify(sentryPayload);
    
    const mockHmac = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('valid-signature')
    };
    
    vi.doMock('crypto', () => ({
      createHmac: vi.fn(() => mockHmac)
    }));

    const event = {
      httpMethod: 'POST',
      headers: {
        'x-sentry-hook-signature': 'valid-signature'
      },
      body
    };

    const response = await handler(event as any);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toBe('Database error');
  });
});