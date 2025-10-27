/**
 * Rate Limiting Types
 * Story 3.11: Rate Limit Mitigation with Tier 2 Claude API Limits
 */

/**
 * Claude API Tier Configuration
 */
export type ClaudeTier = 1 | 2 | 3 | 4;

/**
 * Rate Limit Configuration
 * Tier 2: 80,000 TPM, 50 RPM (from Anthropic pricing page)
 */
export interface RateLimitConfig {
  tier: ClaudeTier;
  tokensPerMinute: number; // TPM limit
  requestsPerMinute: number; // RPM limit
  windowMs: number; // Sliding window duration in milliseconds
  maxWaitMs: number; // Maximum wait time before giving up
  safetyMargin: number; // Use X% of limit for safety (e.g., 0.8 = 80%)
}

/**
 * Token Estimate
 * Predicted token usage for a request
 */
export interface TokenEstimate {
  inputTokens: number; // Prompt + document text
  outputTokens: number; // Expected JSON response
  totalTokens: number; // inputTokens + outputTokens
}

/**
 * Rate Limit Window
 * Tracks usage within current sliding window
 */
export interface RateLimitWindow {
  tokensUsed: number;
  requestsUsed: number;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * Request Tracking Record
 * Individual request tracked for sliding window
 */
export interface RequestRecord {
  timestamp: Date;
  tokens: number;
}

/**
 * Rate Limit Status
 * Current state of rate limiter
 */
export interface RateLimitStatus {
  availableTokens: number;
  availableRequests: number;
  tokensUsedInWindow: number;
  requestsUsedInWindow: number;
  utilizationPercent: number; // 0-100
  isNearLimit: boolean; // >80% utilization
}
