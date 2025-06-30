import { monitoring } from './monitoring';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

export class ResilienceService {
  private static instance: ResilienceService;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): ResilienceService {
    if (!ResilienceService.instance) {
      ResilienceService.instance = new ResilienceService();
    }
    return ResilienceService.instance;
  }

  // Retry with exponential backoff
  async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: {
      reportId?: number;
      stepName?: string;
      operationName: string;
    }
  ): Promise<T> {
    let lastError: Error;
    let delay = config.baseDelayMs;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0 && context.reportId && context.stepName) {
          monitoring.retryStep(context.reportId, context.stepName, attempt);
        }

        const result = await operation();
        
        // Record success metric
        await monitoring.recordSystemMetric(
          `${context.operationName}.success`,
          1,
          'counter',
          { attempt, total_attempts: attempt + 1 }
        );

        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (config.retryableErrors && 
            !config.retryableErrors.some(pattern => 
              lastError.message.includes(pattern))) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Record retry metric
        await monitoring.recordSystemMetric(
          `${context.operationName}.retry`,
          1,
          'counter',
          { attempt: attempt + 1, error: lastError.message }
        );

        // Wait before retry
        await this.sleep(Math.min(delay, config.maxDelayMs));
        delay *= config.backoffMultiplier;
      }
    }

    // Record failure metric
    await monitoring.recordSystemMetric(
      `${context.operationName}.failure`,
      1,
      'counter',
      { total_attempts: config.maxRetries + 1, error: lastError!.message }
    );

    throw lastError!;
  }

  // Circuit breaker pattern
  async withCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceName: string,
    config: CircuitBreakerConfig
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(serviceName);
    
    if (!breaker) {
      breaker = new CircuitBreaker(config);
      this.circuitBreakers.set(serviceName, breaker);
    }

    return breaker.execute(operation, serviceName);
  }

  // Rate limiting
  async withRateLimit<T>(
    operation: () => Promise<T>,
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<T> {
    const rateLimiter = RateLimiter.getInstance();
    
    if (!await rateLimiter.isAllowed(key, maxRequests, windowMs)) {
      throw new Error(`Rate limit exceeded for ${key}`);
    }

    return operation();
  }

  // Timeout wrapper
  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  // Bulkhead pattern - limit concurrent operations
  async withBulkhead<T>(
    operation: () => Promise<T>,
    poolName: string,
    maxConcurrent: number
  ): Promise<T> {
    const bulkhead = Bulkhead.getInstance();
    return bulkhead.execute(operation, poolName, maxConcurrent);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.config.resetTimeoutMs) {
        throw new Error(`Circuit breaker is OPEN for ${serviceName}`);
      }
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private onSuccess(serviceName: string): void {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) { // Require 3 successes to close
        this.state = 'CLOSED';
        monitoring.recordSystemMetric(
          `circuit_breaker.${serviceName}.closed`,
          1,
          'counter'
        );
      }
    }
  }

  private onFailure(serviceName: string): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      monitoring.recordSystemMetric(
        `circuit_breaker.${serviceName}.opened`,
        1,
        'counter',
        { failures: this.failures }
      );
    }
  }
}

class RateLimiter {
  private static instance: RateLimiter;
  private windows: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  async isAllowed(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    const now = Date.now();
    const window = this.windows.get(key);

    if (!window || now >= window.resetTime) {
      this.windows.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (window.count >= maxRequests) {
      return false;
    }

    window.count++;
    return true;
  }
}

class Bulkhead {
  private static instance: Bulkhead;
  private pools: Map<string, { active: number; queue: Array<() => void> }> = new Map();

  private constructor() {}

  static getInstance(): Bulkhead {
    if (!Bulkhead.instance) {
      Bulkhead.instance = new Bulkhead();
    }
    return Bulkhead.instance;
  }

  async execute<T>(
    operation: () => Promise<T>,
    poolName: string,
    maxConcurrent: number
  ): Promise<T> {
    let pool = this.pools.get(poolName);
    if (!pool) {
      pool = { active: 0, queue: [] };
      this.pools.set(poolName, pool);
    }

    if (pool.active >= maxConcurrent) {
      await new Promise<void>(resolve => {
        pool!.queue.push(resolve);
      });
    }

    pool.active++;

    try {
      const result = await operation();
      return result;
    } finally {
      pool.active--;
      const next = pool.queue.shift();
      if (next) {
        next();
      }
    }
  }
}

export const resilience = ResilienceService.getInstance();

// Common retry configurations
export const RETRY_CONFIGS = {
  AI_PROVIDER: {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    retryableErrors: ['timeout', 'rate limit', 'server error', '5']
  },
  BLOCKCHAIN: {
    maxRetries: 3,
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['network', 'timeout', 'congestion']
  },
  AUDIO_GENERATION: {
    maxRetries: 2,
    baseDelayMs: 1500,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    retryableErrors: ['timeout', 'server error', 'quota']
  },
  STORAGE: {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 3000,
    backoffMultiplier: 1.5,
    retryableErrors: ['timeout', 'network', 'server error']
  }
};

// Circuit breaker configurations
export const CIRCUIT_BREAKER_CONFIGS = {
  AI_PROVIDER: {
    failureThreshold: 5,
    resetTimeoutMs: 60000, // 1 minute
    monitoringPeriodMs: 300000 // 5 minutes
  },
  BLOCKCHAIN: {
    failureThreshold: 3,
    resetTimeoutMs: 120000, // 2 minutes
    monitoringPeriodMs: 600000 // 10 minutes
  },
  AUDIO_GENERATION: {
    failureThreshold: 4,
    resetTimeoutMs: 90000, // 1.5 minutes
    monitoringPeriodMs: 300000 // 5 minutes
  }
};