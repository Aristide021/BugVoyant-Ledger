import { supabase } from './supabase';

export interface ProcessingStep {
  name: string;
  startTime: number;
  endTime?: number;
  status: 'started' | 'completed' | 'failed' | 'retrying';
  error?: string;
  provider?: string;
  costCents?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface CostTrackingData {
  serviceType: 'ai_provider' | 'blockchain' | 'audio' | 'storage';
  providerName: string;
  costCents: number;
  usageUnits?: number;
  unitType?: 'tokens' | 'seconds' | 'bytes' | 'transactions';
}

export class MonitoringService {
  private static instance: MonitoringService;
  private processingSteps: Map<string, ProcessingStep[]> = new Map();

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  // Track processing steps for a report
  startStep(reportId: number, stepName: string, metadata?: Record<string, unknown>): void {
    const key = `${reportId}`;
    const steps = this.processingSteps.get(key) || [];
    
    const step: ProcessingStep = {
      name: stepName,
      startTime: Date.now(),
      status: 'started',
      metadata
    };
    
    steps.push(step);
    this.processingSteps.set(key, steps);
    
    // Log to database
    this.trackProcessingStep(reportId, stepName, 'started', undefined, undefined, undefined, undefined, 0, metadata);
  }

  completeStep(
    reportId: number, 
    stepName: string, 
    provider?: string, 
    costCents?: number,
    metadata?: Record<string, unknown>
  ): void {
    const key = `${reportId}`;
    const steps = this.processingSteps.get(key) || [];
    const step = steps.find(s => s.name === stepName && !s.endTime);
    
    if (step) {
      step.endTime = Date.now();
      step.status = 'completed';
      step.provider = provider;
      step.costCents = costCents;
      if (metadata) {
        step.metadata = { ...step.metadata, ...metadata };
      }
      
      const duration = step.endTime - step.startTime;
      
      // Log to database
      this.trackProcessingStep(
        reportId, 
        stepName, 
        'completed', 
        duration, 
        undefined, 
        provider, 
        costCents, 
        step.retryCount || 0,
        step.metadata
      );
    }
  }

  failStep(
    reportId: number, 
    stepName: string, 
    error: string, 
    retryCount: number = 0,
    metadata?: Record<string, unknown>
  ): void {
    const key = `${reportId}`;
    const steps = this.processingSteps.get(key) || [];
    const step = steps.find(s => s.name === stepName && !s.endTime);
    
    if (step) {
      step.endTime = Date.now();
      step.status = 'failed';
      step.error = error;
      step.retryCount = retryCount;
      if (metadata) {
        step.metadata = { ...step.metadata, ...metadata };
      }
      
      const duration = step.endTime - step.startTime;
      
      // Log to database
      this.trackProcessingStep(
        reportId, 
        stepName, 
        'failed', 
        duration, 
        error, 
        undefined, 
        undefined, 
        retryCount,
        step.metadata
      );
    }
  }

  retryStep(reportId: number, stepName: string, retryCount: number): void {
    const key = `${reportId}`;
    const steps = this.processingSteps.get(key) || [];
    const step = steps.find(s => s.name === stepName);
    
    if (step) {
      step.retryCount = retryCount;
      step.status = 'retrying';
      step.startTime = Date.now(); // Reset start time for retry
      step.endTime = undefined;
      
      // Log to database
      this.trackProcessingStep(
        reportId, 
        stepName, 
        'retrying', 
        undefined, 
        undefined, 
        undefined, 
        undefined, 
        retryCount,
        step.metadata
      );
    }
  }

  // Track costs for budget monitoring
  async trackCost(
    userId: string,
    projectId: string,
    costData: CostTrackingData,
    reportId?: number
  ): Promise<void> {
    try {
      await supabase.rpc('track_cost', {
        p_user_id: userId,
        p_project_id: projectId,
        p_service_type: costData.serviceType,
        p_provider_name: costData.providerName,
        p_cost_cents: costData.costCents,
        p_usage_units: costData.usageUnits,
        p_unit_type: costData.unitType,
        p_report_id: reportId
      });
    } catch (error) {
      console.error('Error tracking cost:', error);
    }
  }

  // Record system health metrics
  async recordSystemMetric(
    metricName: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' = 'gauge',
    tags: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await supabase.rpc('record_system_metric', {
        p_metric_name: metricName,
        p_metric_value: value,
        p_metric_type: type,
        p_tags: tags
      });
    } catch (error) {
      console.error('Error recording system metric:', error);
    }
  }

  // Enhanced audit logging
  async logAuditEvent(
    action: string,
    resourceType: string,
    resourceId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    options: {
      userId?: string;
      projectId?: string;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      requestId?: string;
      costCents?: number;
      processingTimeMs?: number;
      providerUsed?: string;
    } = {}
  ): Promise<void> {
    try {
      await supabase.rpc('enhanced_audit_log', {
        p_user_id: options.userId,
        p_project_id: options.projectId,
        p_action: action,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_old_values: oldValues,
        p_new_values: newValues,
        p_ip_address: options.ipAddress,
        p_user_agent: options.userAgent,
        p_session_id: options.sessionId,
        p_request_id: options.requestId,
        p_cost_cents: options.costCents || 0,
        p_processing_time_ms: options.processingTimeMs,
        p_provider_used: options.providerUsed
      });
    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  // Get processing metrics for a report
  getProcessingSteps(reportId: number): ProcessingStep[] {
    return this.processingSteps.get(`${reportId}`) || [];
  }

  // Clean up completed processing data
  cleanupProcessingData(reportId: number): void {
    this.processingSteps.delete(`${reportId}`);
  }

  // Get system health summary
  async getSystemHealth(): Promise<unknown[]> {
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching system health:', error);
      return [];
    }
  }

  // Get cost summary for user
  async getCostSummary(userId: string, period: string = 'current'): Promise<unknown[]> {
    try {
      const { data, error } = await supabase
        .from('cost_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('billing_period', period === 'current' ? 
          new Date().toISOString().slice(0, 7) : period)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching cost summary:', error);
      return [];
    }
  }

  private async trackProcessingStep(
    reportId: number,
    stepName: string,
    status: string,
    durationMs?: number,
    errorMessage?: string,
    providerUsed?: string,
    costCents?: number,
    retryCount?: number,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.rpc('track_processing_step', {
        p_report_id: reportId,
        p_step_name: stepName,
        p_status: status,
        p_duration_ms: durationMs,
        p_error_message: errorMessage,
        p_provider_used: providerUsed,
        p_cost_cents: costCents || 0,
        p_retry_count: retryCount || 0,
        p_metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error tracking processing step:', error);
    }
  }
}

export const monitoring = MonitoringService.getInstance();