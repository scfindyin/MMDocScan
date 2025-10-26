/**
 * Unit tests for RateLimitManager (Story 3.11, Task 13.1)
 * Tests token tracking, sliding window, throttling logic, and backoff
 */

import { RateLimitManager, RateLimitStats } from '../RateLimitManager';

describe('RateLimitManager', () => {
  let manager: RateLimitManager;

  beforeEach(() => {
    // Get singleton instance and reset state before each test
    manager = RateLimitManager.getInstance();
    manager.reset();

    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RateLimitManager.getInstance();
      const instance2 = RateLimitManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Token Tracking', () => {
    it('should track token usage correctly', () => {
      manager.trackTokenUsage(1000);

      const usage = manager.getCurrentUsage();
      expect(usage).toBe(1000);
    });

    it('should accumulate multiple token usages', () => {
      manager.trackTokenUsage(1000);
      manager.trackTokenUsage(2000);
      manager.trackTokenUsage(3000);

      const usage = manager.getCurrentUsage();
      expect(usage).toBe(6000);
    });

    it('should return 0 when no tokens tracked', () => {
      const usage = manager.getCurrentUsage();
      expect(usage).toBe(0);
    });
  });

  describe('Sliding Window Reset', () => {
    it('should clean up entries older than 60 seconds', async () => {
      // Track tokens
      manager.trackTokenUsage(5000);

      // Fast-forward time by mocking Date.now()
      const originalNow = Date.now;
      const startTime = originalNow();

      // Mock Date.now to return 61 seconds later
      Date.now = jest.fn(() => startTime + 61 * 1000);

      // Check usage - should be 0 after window expires
      const usage = manager.getCurrentUsage();
      expect(usage).toBe(0);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should keep entries within the 60-second window', async () => {
      manager.trackTokenUsage(5000);

      // Fast-forward 30 seconds (within window)
      const originalNow = Date.now;
      const startTime = originalNow();
      Date.now = jest.fn(() => startTime + 30 * 1000);

      const usage = manager.getCurrentUsage();
      expect(usage).toBe(5000);

      Date.now = originalNow;
    });
  });

  describe('Throttling Logic', () => {
    it('should allow requests within the effective limit', async () => {
      manager.trackTokenUsage(10000);

      // 25,500 is the effective limit (85% of 30,000)
      // Current: 10,000, adding 10,000 = 20,000 (under limit)
      const canProceed = await manager.canProceed(10000);
      expect(canProceed).toBe(true);
    });

    it('should allow requests at exactly the effective limit', async () => {
      manager.trackTokenUsage(20000);

      // Adding 5,500 brings us to exactly 25,500 (effective limit)
      const canProceed = await manager.canProceed(5500);
      expect(canProceed).toBe(true);
    });

    it('should throttle when exceeding the effective limit', async () => {
      // Track tokens close to limit
      manager.trackTokenUsage(20000);

      // Mock sleep to avoid actual delay in tests
      const sleepSpy = jest.spyOn(manager as any, 'sleep').mockResolvedValue(undefined);

      // Mock Date.now to simulate time passing during sleep
      const originalNow = Date.now;
      const startTime = originalNow();
      let callCount = 0;

      Date.now = jest.fn(() => {
        callCount++;
        // After sleep, simulate 61 seconds passing (window expired)
        return callCount > 5 ? startTime + 61 * 1000 : startTime;
      });

      // This should trigger throttling (20,000 + 10,000 = 30,000 > 25,500)
      const canProceed = await manager.canProceed(10000);

      // Should have called sleep
      expect(sleepSpy).toHaveBeenCalled();
      expect(canProceed).toBe(true);

      // Restore
      Date.now = originalNow;
      sleepSpy.mockRestore();
    });
  });

  describe('Exponential Backoff', () => {
    it('should implement exponential backoff correctly', async () => {
      const sleepSpy = jest.spyOn(manager as any, 'sleep').mockResolvedValue(undefined);

      // First 429 error - should wait 1 second
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(1000);

      // Second 429 error - should wait 2 seconds
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(2000);

      // Third 429 error - should wait 4 seconds
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(4000);

      // Fourth 429 error - should wait 8 seconds
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(8000);

      // Fifth 429 error - should wait 16 seconds
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(16000);

      sleepSpy.mockRestore();
    });

    it('should throw error after max retry attempts', async () => {
      const sleepSpy = jest.spyOn(manager as any, 'sleep').mockResolvedValue(undefined);

      // Exhaust all 5 attempts
      await manager.handle429Error();
      await manager.handle429Error();
      await manager.handle429Error();
      await manager.handle429Error();
      await manager.handle429Error();

      // 6th attempt should throw
      await expect(manager.handle429Error()).rejects.toThrow(
        'Rate limit exceeded after 5 retry attempts'
      );

      sleepSpy.mockRestore();
    });

    it('should reset backoff on successful request', async () => {
      const sleepSpy = jest.spyOn(manager as any, 'sleep').mockResolvedValue(undefined);

      // Trigger one backoff
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(1000);

      // Reset backoff
      manager.resetBackoff();

      // Next backoff should be 1 second again (not 2)
      await manager.handle429Error();
      expect(sleepSpy).toHaveBeenCalledWith(1000);

      sleepSpy.mockRestore();
    });
  });

  describe('Rate Limit Statistics', () => {
    it('should return correct statistics when empty', () => {
      const stats: RateLimitStats = manager.getRateLimitStats();

      expect(stats.currentUsage).toBe(0);
      expect(stats.limit).toBe(30000);
      expect(stats.safetyBuffer).toBe(0.85);
      expect(stats.effectiveLimit).toBe(25500);
      expect(stats.percentageUsed).toBe(0);
      expect(stats.timeUntilReset).toBe(0);
    });

    it('should return correct statistics with token usage', () => {
      manager.trackTokenUsage(10000);

      const stats: RateLimitStats = manager.getRateLimitStats();

      expect(stats.currentUsage).toBe(10000);
      expect(stats.limit).toBe(30000);
      expect(stats.effectiveLimit).toBe(25500);
      expect(stats.percentageUsed).toBeCloseTo(39.22, 1); // 10000/25500 * 100
      expect(stats.timeUntilReset).toBeGreaterThan(59); // Should be ~60 seconds
      expect(stats.timeUntilReset).toBeLessThanOrEqual(60);
    });

    it('should calculate percentage correctly at different usage levels', () => {
      // 50% usage
      manager.trackTokenUsage(12750); // 50% of 25,500
      let stats = manager.getRateLimitStats();
      expect(stats.percentageUsed).toBeCloseTo(50, 1);

      manager.reset();

      // 100% usage
      manager.trackTokenUsage(25500); // 100% of effective limit
      stats = manager.getRateLimitStats();
      expect(stats.percentageUsed).toBeCloseTo(100, 1);
    });

    it('should calculate time until reset correctly', async () => {
      const originalNow = Date.now;
      const startTime = originalNow();

      // Track tokens at start time
      Date.now = jest.fn(() => startTime);
      manager.trackTokenUsage(5000);

      // Check stats 30 seconds later
      Date.now = jest.fn(() => startTime + 30 * 1000);
      const stats = manager.getRateLimitStats();

      // Should be 30 seconds remaining (60 - 30)
      expect(stats.timeUntilReset).toBeCloseTo(30, 0);

      Date.now = originalNow;
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero token tracking', () => {
      manager.trackTokenUsage(0);

      const usage = manager.getCurrentUsage();
      expect(usage).toBe(0);
    });

    it('should handle very large token values', () => {
      manager.trackTokenUsage(1000000);

      const usage = manager.getCurrentUsage();
      expect(usage).toBe(1000000);
    });

    it('should handle negative token values (edge case)', () => {
      manager.trackTokenUsage(-1000);

      const usage = manager.getCurrentUsage();
      expect(usage).toBe(-1000); // Should track even if negative
    });

    it('should reset state completely', () => {
      manager.trackTokenUsage(10000);
      manager.handle429Error(); // Increment backoff

      manager.reset();

      const usage = manager.getCurrentUsage();
      const stats = manager.getRateLimitStats();

      expect(usage).toBe(0);
      expect(stats.currentUsage).toBe(0);
      expect(stats.timeUntilReset).toBe(0);
    });
  });
});
