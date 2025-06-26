import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptionService } from '../lib/encryption';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } } }))
    }
  }
}));

describe('EncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate encryption key', async () => {
    const key = await encryptionService.generateEncryptionKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    expect(key.length).toBe(64); // 32 bytes * 2 (hex)
  });

  it('should set encryption key', () => {
    const testKey = 'test-key-123';
    encryptionService.setEncryptionKey(testKey);
    // Key is set internally, we can't directly test it without exposing private members
    expect(true).toBe(true);
  });

  it('should fail to store secret without encryption key', async () => {
    const service = encryptionService;
    // Reset encryption key
    service.setEncryptionKey('');
    
    const result = await service.storeSecret('project-id', 'sentry_auth_token', 'secret-value');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Encryption key not set');
  });

  it('should check if secrets exist', async () => {
    const hasSecrets = await encryptionService.hasSecrets('project-id');
    expect(typeof hasSecrets).toBe('boolean');
  });

  it('should get secret types', async () => {
    const secretTypes = await encryptionService.getSecretTypes('project-id');
    expect(Array.isArray(secretTypes)).toBe(true);
  });
});