/**
 * Token Estimator Service (Story 3.11)
 * Uses Anthropic's count_tokens API for accurate token estimation before extraction
 *
 * Features:
 * - Accurate token counting via Claude API
 * - Cache estimations per PDF hash to avoid redundant API calls
 * - SHA-256 hashing for cache keys
 * - Error handling for API failures
 */

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';

interface TokenEstimation {
  tokens: number;
  pdfHash: string;
  timestamp: number;
}

export class TokenEstimator {
  private static instance: TokenEstimator;
  private anthropic: Anthropic;
  private cache: Map<string, TokenEstimation> = new Map();

  // Cache expiry: 1 hour (estimations don't change for same PDF)
  private readonly CACHE_TTL_MS = 60 * 60 * 1000;

  private constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({ apiKey });
    console.log('[TokenEstimator] Initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TokenEstimator {
    if (!TokenEstimator.instance) {
      TokenEstimator.instance = new TokenEstimator();
    }
    return TokenEstimator.instance;
  }

  /**
   * Estimate tokens for a PDF
   * @param pdfBase64 Base64-encoded PDF content
   * @returns Token count
   * @throws Error if API call fails
   */
  async estimateTokens(pdfBase64: string): Promise<number> {
    // Generate hash for caching
    const pdfHash = this.hashPDF(pdfBase64);

    // Check cache first
    const cached = this.getCached(pdfHash);
    if (cached) {
      console.log(`[TokenEstimator] ✓ Cache hit for PDF hash ${pdfHash.substring(0, 12)}...`);
      console.log(`  Tokens: ${cached.tokens.toLocaleString()}`);
      return cached.tokens;
    }

    console.log(`[TokenEstimator] Cache miss for PDF hash ${pdfHash.substring(0, 12)}...`);
    console.log('  Calling count_tokens API...');

    try {
      const response = await this.anthropic.messages.countTokens({
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

      const tokens = response.input_tokens;

      // Store in cache
      this.cache.set(pdfHash, {
        tokens,
        pdfHash,
        timestamp: Date.now(),
      });

      console.log(`[TokenEstimator] ✓ Estimation complete: ${tokens.toLocaleString()} tokens`);
      console.log(`  Cached for future requests`);

      return tokens;
    } catch (error: unknown) {
      console.error('[TokenEstimator] ❌ Error estimating tokens:', error);

      if (error instanceof Error) {
        throw new Error(`Token estimation failed: ${error.message}`);
      }

      throw new Error('Token estimation failed: Unknown error');
    }
  }

  /**
   * Estimate tokens for text content (used for chunked text-based extraction)
   * @param text Plain text content
   * @returns Token count
   * @throws Error if API call fails
   */
  async estimateTextTokens(text: string): Promise<number> {
    // Generate hash for caching
    const textHash = this.hashText(text);

    // Check cache first
    const cached = this.getCached(textHash);
    if (cached) {
      console.log(`[TokenEstimator] ✓ Cache hit for text hash ${textHash.substring(0, 12)}...`);
      console.log(`  Tokens: ${cached.tokens.toLocaleString()}`);
      return cached.tokens;
    }

    console.log(`[TokenEstimator] Cache miss for text hash ${textHash.substring(0, 12)}...`);
    console.log('  Calling count_tokens API for text...');

    try {
      const response = await this.anthropic.messages.countTokens({
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

      const tokens = response.input_tokens;

      // Store in cache
      this.cache.set(textHash, {
        tokens,
        pdfHash: textHash,
        timestamp: Date.now(),
      });

      console.log(`[TokenEstimator] ✓ Text estimation complete: ${tokens.toLocaleString()} tokens`);

      return tokens;
    } catch (error: unknown) {
      console.error('[TokenEstimator] ❌ Error estimating text tokens:', error);

      if (error instanceof Error) {
        throw new Error(`Text token estimation failed: ${error.message}`);
      }

      throw new Error('Text token estimation failed: Unknown error');
    }
  }

  /**
   * Generate SHA-256 hash of PDF base64 string
   * @param pdfBase64 Base64-encoded PDF
   * @returns SHA-256 hash
   */
  private hashPDF(pdfBase64: string): string {
    return createHash('sha256').update(pdfBase64).digest('hex');
  }

  /**
   * Generate SHA-256 hash of text string
   * @param text Plain text
   * @returns SHA-256 hash
   */
  private hashText(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Get cached estimation if exists and not expired
   * @param hash PDF or text hash
   * @returns Cached estimation or null
   */
  private getCached(hash: string): TokenEstimation | null {
    const cached = this.cache.get(hash);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL_MS) {
      console.log(`[TokenEstimator] Cache entry expired (age: ${(age / 1000 / 60).toFixed(1)}min)`);
      this.cache.delete(hash);
      return null;
    }

    return cached;
  }

  /**
   * Get cache statistics
   * @returns Cache metrics
   */
  getCacheStats(): {
    size: number;
    oldestEntryAge: number; // milliseconds
  } {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    let oldestEntryAge = 0;
    if (entries.length > 0) {
      const oldestTimestamp = Math.min(...entries.map(e => e.timestamp));
      oldestEntryAge = now - oldestTimestamp;
    }

    return {
      size: this.cache.size,
      oldestEntryAge,
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    console.log(`[TokenEstimator] Cleared cache (${this.cache.size} entries)`);
    this.cache.clear();
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    const beforeSize = this.cache.size;

    // Convert to array to avoid iterator issues
    const entries = Array.from(this.cache.entries());
    for (const [hash, entry] of entries) {
      const age = now - entry.timestamp;
      if (age > this.CACHE_TTL_MS) {
        this.cache.delete(hash);
      }
    }

    const afterSize = this.cache.size;
    const removed = beforeSize - afterSize;

    if (removed > 0) {
      console.log(`[TokenEstimator] 🧹 Cleaned up ${removed} expired cache entries`);
    }
  }
}

// Export singleton instance
export const tokenEstimator = TokenEstimator.getInstance();
