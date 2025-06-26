import { supabase } from './supabase';

// Client-side encryption utilities with enhanced security
export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;
  private keyExpiryTime: number | null = null;
  private readonly KEY_EXPIRY_HOURS = 24; // 24 hour session expiry

  private constructor() {
    this.loadPersistedKey();
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Load encryption key from sessionStorage with expiry check
  private loadPersistedKey(): void {
    try {
      const keyData = sessionStorage.getItem('encryption_key_data');
      if (keyData) {
        const { key, expiry } = JSON.parse(keyData);
        if (Date.now() < expiry) {
          this.encryptionKey = key;
          this.keyExpiryTime = expiry;
        } else {
          // Key expired, remove it
          sessionStorage.removeItem('encryption_key_data');
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted encryption key:', error);
      sessionStorage.removeItem('encryption_key_data');
    }
  }

  // Generate a secure encryption key for the user session
  async generateEncryptionKey(): Promise<string> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const key = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    
    // Set expiry time
    const expiry = Date.now() + (this.KEY_EXPIRY_HOURS * 60 * 60 * 1000);
    
    this.encryptionKey = key;
    this.keyExpiryTime = expiry;
    
    // Persist to sessionStorage with expiry
    try {
      sessionStorage.setItem('encryption_key_data', JSON.stringify({
        key,
        expiry
      }));
    } catch (error) {
      console.warn('Failed to persist encryption key:', error);
    }
    
    return key;
  }

  // Set encryption key (from secure storage or user input)
  setEncryptionKey(key: string): void {
    const expiry = Date.now() + (this.KEY_EXPIRY_HOURS * 60 * 60 * 1000);
    this.encryptionKey = key;
    this.keyExpiryTime = expiry;
    
    try {
      sessionStorage.setItem('encryption_key_data', JSON.stringify({
        key,
        expiry
      }));
    } catch (error) {
      console.warn('Failed to persist encryption key:', error);
    }
  }

  // Check if encryption key is valid and not expired
  isKeyValid(): boolean {
    return !!(this.encryptionKey && 
             this.keyExpiryTime && 
             Date.now() < this.keyExpiryTime);
  }

  // Clear encryption key
  clearKey(): void {
    this.encryptionKey = null;
    this.keyExpiryTime = null;
    try {
      sessionStorage.removeItem('encryption_key_data');
    } catch (error) {
      console.warn('Failed to clear encryption key:', error);
    }
  }

  // Store encrypted secret
  async storeSecret(
    projectId: string,
    secretType: 'sentry_auth_token' | 'slack_webhook_url' | 'api_key',
    secretValue: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isKeyValid()) {
      return { success: false, error: 'Encryption key not set or expired' };
    }

    try {
      const { data, error } = await supabase.rpc('store_encrypted_secret', {
        p_project_id: projectId,
        p_secret_type: secretType,
        p_secret_value: secretValue,
        p_encryption_key: this.encryptionKey
      });

      if (error) throw error;

      // Log audit event
      await this.logAuditEvent(
        projectId,
        'CREATE',
        'encrypted_secret',
        data,
        null,
        { secret_type: secretType }
      );

      return { success: true };
    } catch (error) {
      console.error('Error storing encrypted secret:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Check if secrets exist for a project
  async hasSecrets(projectId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('encrypted_secrets')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking secrets:', error);
      return false;
    }
  }

  // Get secret types for a project
  async getSecretTypes(projectId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('encrypted_secrets')
        .select('secret_type')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) throw error;
      return data?.map(item => item.secret_type) || [];
    } catch (error) {
      console.error('Error getting secret types:', error);
      return [];
    }
  }

  // Rotate API key
  async rotateSecret(
    projectId: string,
    secretType: string,
    newSecretValue: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isKeyValid()) {
      return { success: false, error: 'Encryption key not set or expired' };
    }

    try {
      // Store new secret (this will automatically deactivate the old one)
      const storeResult = await this.storeSecret(projectId, secretType as any, newSecretValue);
      
      if (!storeResult.success) {
        return storeResult;
      }

      // Log rotation event
      const { error: rotationError } = await supabase
        .from('api_key_rotations')
        .insert({
          project_id: projectId,
          secret_type: secretType,
          rotation_reason: reason,
          rotated_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (rotationError) {
        console.error('Error logging rotation:', rotationError);
      }

      return { success: true };
    } catch (error) {
      console.error('Error rotating secret:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Log audit event
  private async logAuditEvent(
    projectId: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any
  ): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      
      await supabase.rpc('log_audit_event', {
        p_user_id: user?.id,
        p_project_id: projectId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_old_values: oldValues,
        p_new_values: newValues
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  // Get audit logs for a project
  async getAuditLogs(projectId: string, limit: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }
}

export const encryptionService = EncryptionService.getInstance();