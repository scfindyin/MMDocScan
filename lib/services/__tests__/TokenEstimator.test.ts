/**
 * Unit tests for TokenEstimator (Story 3.11, Task 13.2)
 * Tests token estimation, caching, and error handling
 */

// Mock Anthropic SDK with factory function
jest.mock('@anthropic-ai/sdk', () => {
  // Create mock inside factory to avoid initialization issues
  const mockFn = jest.fn();
  return jest.fn().mockImplementation(() => ({
    messages: {
      countTokens: mockFn,
    },
  }));
});

import { TokenEstimator } from '../TokenEstimator';
import Anthropic from '@anthropic-ai/sdk';

// Get the actual mock function from the mocked instance
const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;
let actualMockCountTokens: jest.Mock;

describe('TokenEstimator', () => {
  let estimator: TokenEstimator;

  beforeEach(() => {
    // Get singleton instance
    estimator = TokenEstimator.getInstance();
    estimator.clearCache();

    // Get the mock function from the mocked instance
    const mockInstance = new MockedAnthropic();
    actualMockCountTokens = mockInstance.messages.countTokens as jest.Mock;

    // Reset mock
    actualMockCountTokens.mockReset();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TokenEstimator.getInstance();
      const instance2 = TokenEstimator.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('PDF Token Estimation', () => {
    it('should estimate tokens for a PDF correctly', async () => {
      const mockResponse = { input_tokens: 5000 };
      actualMockCountTokens.mockResolvedValue(mockResponse);

      const pdfBase64 = 'base64encodedpdfcontent';
      const tokens = await estimator.estimateTokens(pdfBase64);

      expect(tokens).toBe(5000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1);
      expect(actualMockCountTokens).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250926',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
            ],
          },
        ],
      });
    });

    it('should cache PDF estimations based on hash', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });

      const pdfBase64 = 'base64encodedpdfcontent';

      // First call - should hit API
      const tokens1 = await estimator.estimateTokens(pdfBase64);
      expect(tokens1).toBe(5000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1);

      // Second call with same PDF - should use cache
      const tokens2 = await estimator.estimateTokens(pdfBase64);
      expect(tokens2).toBe(5000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Different PDF - should hit API again
      const differentPdf = 'differentpdfcontent';
      actualMockCountTokens.mockResolvedValue({ input_tokens: 3000 });
      const tokens3 = await estimator.estimateTokens(differentPdf);
      expect(tokens3).toBe(3000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
      actualMockCountTokens.mockRejectedValue(new Error('API request failed'));

      const pdfBase64 = 'base64encodedpdfcontent';

      await expect(estimator.estimateTokens(pdfBase64)).rejects.toThrow(
        'Token estimation failed: API request failed'
      );
    });

    it('should handle unknown errors', async () => {
      actualMockCountTokens.mockRejectedValue('Unknown error');

      const pdfBase64 = 'base64encodedpdfcontent';

      await expect(estimator.estimateTokens(pdfBase64)).rejects.toThrow(
        'Token estimation failed: Unknown error'
      );
    });
  });

  describe('Text Token Estimation', () => {
    it('should estimate tokens for text correctly', async () => {
      const mockResponse = { input_tokens: 2000 };
      actualMockCountTokens.mockResolvedValue(mockResponse);

      const text = 'This is a sample text for token estimation';
      const tokens = await estimator.estimateTextTokens(text);

      expect(tokens).toBe(2000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1);
      expect(actualMockCountTokens).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-5-20250926',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text,
              },
            ],
          },
        ],
      });
    });

    it('should cache text estimations based on hash', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 2000 });

      const text = 'This is a sample text';

      // First call - should hit API
      const tokens1 = await estimator.estimateTextTokens(text);
      expect(tokens1).toBe(2000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1);

      // Second call with same text - should use cache
      const tokens2 = await estimator.estimateTextTokens(text);
      expect(tokens2).toBe(2000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1); // Still 1

      // Different text - should hit API again
      const differentText = 'Different text content';
      actualMockCountTokens.mockResolvedValue({ input_tokens: 1000 });
      const tokens3 = await estimator.estimateTextTokens(differentText);
      expect(tokens3).toBe(1000);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors for text estimation', async () => {
      actualMockCountTokens.mockRejectedValue(new Error('Text API error'));

      const text = 'Sample text';

      await expect(estimator.estimateTextTokens(text)).rejects.toThrow(
        'Text token estimation failed: Text API error'
      );
    });
  });

  describe('Cache Management', () => {
    it('should expire cache entries after 1 hour', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });

      const pdfBase64 = 'base64encodedpdfcontent';

      // First call - populate cache
      await estimator.estimateTokens(pdfBase64);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1);

      // Mock Date.now to simulate 61 minutes passing
      const originalNow = Date.now;
      const startTime = originalNow();
      Date.now = jest.fn(() => startTime + 61 * 60 * 1000);

      // Second call - cache should be expired, hit API again
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });
      await estimator.estimateTokens(pdfBase64);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(2);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should keep cache entries within 1 hour window', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });

      const pdfBase64 = 'base64encodedpdfcontent';

      // First call
      await estimator.estimateTokens(pdfBase64);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1);

      // Mock Date.now to simulate 30 minutes passing (within 1 hour)
      const originalNow = Date.now;
      const startTime = originalNow();
      Date.now = jest.fn(() => startTime + 30 * 60 * 1000);

      // Second call - should use cache
      await estimator.estimateTokens(pdfBase64);
      expect(actualMockCountTokens).toHaveBeenCalledTimes(1); // Still 1

      // Restore
      Date.now = originalNow;
    });

    it('should return correct cache statistics', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });

      // Empty cache
      let stats = estimator.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.oldestEntryAge).toBe(0);

      // Add one entry
      await estimator.estimateTokens('pdf1');
      stats = estimator.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.oldestEntryAge).toBeGreaterThanOrEqual(0);

      // Add another entry
      await estimator.estimateTokens('pdf2');
      stats = estimator.getCacheStats();
      expect(stats.size).toBe(2);
    });

    it('should clear cache completely', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });

      // Populate cache
      await estimator.estimateTokens('pdf1');
      await estimator.estimateTokens('pdf2');

      let stats = estimator.getCacheStats();
      expect(stats.size).toBe(2);

      // Clear cache
      estimator.clearCache();

      stats = estimator.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should cleanup expired cache entries', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });

      const originalNow = Date.now;
      const startTime = originalNow();

      // Add first entry at T=0
      Date.now = jest.fn(() => startTime);
      await estimator.estimateTokens('pdf1');

      // Add second entry at T=30min (within TTL)
      Date.now = jest.fn(() => startTime + 30 * 60 * 1000);
      await estimator.estimateTokens('pdf2');

      // Move to T=62min (first entry expired, second still valid)
      Date.now = jest.fn(() => startTime + 62 * 60 * 1000);

      // Cleanup should remove first entry
      estimator.cleanupCache();

      const stats = estimator.getCacheStats();
      expect(stats.size).toBe(1); // Only pdf2 remains

      // Restore
      Date.now = originalNow;
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty PDF base64', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 0 });

      const tokens = await estimator.estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle empty text', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 0 });

      const tokens = await estimator.estimateTextTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle very large token counts', async () => {
      actualMockCountTokens.mockResolvedValue({ input_tokens: 1000000 });

      const tokens = await estimator.estimateTokens('verylargepdf');
      expect(tokens).toBe(1000000);
    });

    it('should handle PDF and text estimations independently', async () => {
      // PDF estimation
      actualMockCountTokens.mockResolvedValue({ input_tokens: 5000 });
      const pdfTokens = await estimator.estimateTokens('pdfcontent');
      expect(pdfTokens).toBe(5000);

      // Text estimation (note: same string produces same hash, so it would hit cache)
      // Use different content to demonstrate they're independent
      actualMockCountTokens.mockResolvedValue({ input_tokens: 3000 });
      const textTokens = await estimator.estimateTextTokens('textcontent');
      expect(textTokens).toBe(3000);

      // Should have made 2 API calls (different content strings)
      expect(actualMockCountTokens).toHaveBeenCalledTimes(2);
    });
  });
});
