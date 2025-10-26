/**
 * Rate Limit Manager for Claude API (Story 3.11)
 * Manages token usage tracking and throttling to prevent 429 errors
 *
 * Features:
 * - Sliding window token tracking (60 seconds)
 * - 30k TPM limit with 85% safety buffer (25.5k effective limit)
 * - Proactive throttling when approaching limit
 * - Exponential backoff for 429 errors
 * - Rate limit statistics
 */

interface TokenUsageEntry {
  tokens: number;
  timestamp: number;
}

export interface RateLimitStats {
  currentUsage: number;
  limit: number;
  safetyBuffer: number;
  effectiveLimit: number;
  percentageUsed: number;
  timeUntilReset: number; // seconds
}

export class RateLimitManager {
  private static instance: RateLimitManager;

  // Tier 1 Claude API limit: 30,000 TPM
  private readonly TPM_LIMIT = 30000;

  // 85% safety buffer to avoid hitting limit
  private readonly SAFETY_BUFFER = 0.85;
  private readonly EFFECTIVE_LIMIT = this.TPM_LIMIT * this.SAFETY_BUFFER; // 25,500 TPM

  // Sliding window size (60 seconds)
  private readonly WINDOW_SIZE_MS = 60 * 1000;

  // Token usage tracking with timestamps
  private tokenUsage: TokenUsageEntry[] = [];

  // Exponential backoff state
  private backoffAttempts = 0;
  private readonly MAX_BACKOFF_ATTEMPTS = 5;

  // Singleton constructor
  private constructor() {
    console.log('[RateLimitManager] Initialized with:');
    console.log(`  TPM Limit: ${this.TPM_LIMIT.toLocaleString()}`);
    console.log(`  Safety Buffer: ${(this.SAFETY_BUFFER * 100).toFixed(0)}%`);
    console.log(`  Effective Limit: ${this.EFFECTIVE_LIMIT.toLocaleString()}`);
    console.log(`  Window Size: ${this.WINDOW_SIZE_MS / 1000}s`);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Track token usage in sliding window
   * @param tokens Number of tokens used in the request
   */
  trackTokenUsage(tokens: number): void {
    const now = Date.now();
    this.tokenUsage.push({ tokens, timestamp: now });
    this.cleanupExpiredEntries();

    const currentUsage = this.getCurrentUsage();
    const percentage = ((currentUsage / this.EFFECTIVE_LIMIT) * 100).toFixed(1);

    console.log(`[RateLimitManager] Tracked ${tokens.toLocaleString()} tokens`);
    console.log(`  Current usage: ${currentUsage.toLocaleString()}/${this.EFFECTIVE_LIMIT.toLocaleString()} (${percentage}%)`);
    console.log(`  Entries in window: ${this.tokenUsage.length}`);
  }

  /**
   * Get current token usage within the sliding window
   * @returns Total tokens used in the last 60 seconds
   */
  getCurrentUsage(): number {
    this.cleanupExpiredEntries();
    return this.tokenUsage.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  /**
   * Check if we can proceed with a request
   * Waits if approaching rate limit
   * @param estimatedTokens Estimated tokens for the upcoming request
   * @returns Promise<boolean> True when safe to proceed
   */
  async canProceed(estimatedTokens: number): Promise<boolean> {
    this.cleanupExpiredEntries();
    const currentUsage = this.getCurrentUsage();
    const projectedUsage = currentUsage + estimatedTokens;

    // If within limit, proceed immediately
    if (projectedUsage <= this.EFFECTIVE_LIMIT) {
      const percentage = ((projectedUsage / this.EFFECTIVE_LIMIT) * 100).toFixed(1);
      console.log(`[RateLimitManager] ✓ Can proceed`);
      console.log(`  Projected usage: ${projectedUsage.toLocaleString()}/${this.EFFECTIVE_LIMIT.toLocaleString()} (${percentage}%)`);
      return true;
    }

    // Need to wait for window to reset
    const oldestEntry = this.tokenUsage[0];
    if (oldestEntry) {
      const timeUntilReset = this.WINDOW_SIZE_MS - (Date.now() - oldestEntry.timestamp);

      if (timeUntilReset > 0) {
        const seconds = (timeUntilReset / 1000).toFixed(1);
        console.log(`[RateLimitManager] ⏸️ Throttling: Projected usage ${projectedUsage.toLocaleString()} exceeds limit`);
        console.log(`  Waiting ${seconds}s for rate limit window to reset...`);

        await this.sleep(timeUntilReset);

        // Recursively check again after waiting
        return this.canProceed(estimatedTokens);
      }
    }

    // If no old entries, we can proceed
    return true;
  }

  /**
   * Handle 429 rate limit errors with exponential backoff
   * Throws error if max retries exceeded
   */
  async handle429Error(): Promise<void> {
    this.backoffAttempts++;

    if (this.backoffAttempts > this.MAX_BACKOFF_ATTEMPTS) {
      const error = new Error(
        `Rate limit exceeded after ${this.MAX_BACKOFF_ATTEMPTS} retry attempts`
      );
      console.error('[RateLimitManager] ❌ Max retries exceeded:', error.message);
      throw error;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delayMs = Math.pow(2, this.backoffAttempts - 1) * 1000;
    const seconds = (delayMs / 1000).toFixed(0);

    console.log(`[RateLimitManager] ⚠️ 429 error received`);
    console.log(`  Attempt ${this.backoffAttempts}/${this.MAX_BACKOFF_ATTEMPTS}`);
    console.log(`  Waiting ${seconds}s before retry...`);

    await this.sleep(delayMs);
  }

  /**
   * Reset backoff counter on successful request
   */
  resetBackoff(): void {
    if (this.backoffAttempts > 0) {
      console.log(`[RateLimitManager] ✓ Backoff reset (was at ${this.backoffAttempts} attempts)`);
      this.backoffAttempts = 0;
    }
  }

  /**
   * Get rate limit statistics
   * @returns Current rate limit metrics
   */
  getRateLimitStats(): RateLimitStats {
    const currentUsage = this.getCurrentUsage();
    const percentageUsed = (currentUsage / this.EFFECTIVE_LIMIT) * 100;

    const oldestEntry = this.tokenUsage[0];
    const timeUntilReset = oldestEntry
      ? Math.max(0, this.WINDOW_SIZE_MS - (Date.now() - oldestEntry.timestamp)) / 1000
      : 0;

    return {
      currentUsage,
      limit: this.TPM_LIMIT,
      safetyBuffer: this.SAFETY_BUFFER,
      effectiveLimit: this.EFFECTIVE_LIMIT,
      percentageUsed,
      timeUntilReset,
    };
  }

  /**
   * Clean up expired entries from sliding window
   * Removes entries older than WINDOW_SIZE_MS
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const cutoff = now - this.WINDOW_SIZE_MS;

    const beforeCount = this.tokenUsage.length;
    this.tokenUsage = this.tokenUsage.filter(entry => entry.timestamp > cutoff);
    const afterCount = this.tokenUsage.length;

    if (beforeCount > afterCount) {
      const removed = beforeCount - afterCount;
      console.log(`[RateLimitManager] 🧹 Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Sleep helper for async delays
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset all state (useful for testing)
   */
  reset(): void {
    console.log('[RateLimitManager] Reset state');
    this.tokenUsage = [];
    this.backoffAttempts = 0;
  }
}

// Export singleton instance
export const rateLimitManager = RateLimitManager.getInstance();
