/**
 * Result Merger Service (Story 3.11)
 * Merges results from multiple chunks into a single coherent extraction result
 *
 * Features:
 * - Combine chunked extraction results
 * - Preserve source metadata (page numbers, confidence scores)
 * - Handle partial failures gracefully
 * - Calculate aggregate statistics
 * - Detect duplicates (optional deduplication)
 */

export interface ChunkResult {
  chunkId: string;
  chunkIndex: number;
  startPage: number;
  endPage: number;
  documentIndex?: number;
  extractedData: unknown; // Claude API response content
  success: boolean;
  error?: string;
  tokensUsed: number;
  cacheHit: boolean; // Was this a cache hit?
  confidence?: number; // Overall confidence for this chunk
}

export interface MergedResult {
  success: boolean;
  extractedData: unknown[]; // Array of all extracted items with metadata
  metadata: ResultMetadata;
  errors: string[];
}

export interface ResultMetadata {
  totalChunks: number;
  successfulChunks: number;
  failedChunks: number;
  totalTokensUsed: number;
  cacheHitRate: number; // Percentage (0-100)
  warnings: string[];
  tier: string; // Chunking tier used
}

export class ResultMerger {
  private static instance: ResultMerger;

  private constructor() {
    console.log('[ResultMerger] Initialized');
  }

  static getInstance(): ResultMerger {
    if (!ResultMerger.instance) {
      ResultMerger.instance = new ResultMerger();
    }
    return ResultMerger.instance;
  }

  /**
   * Merge results from multiple chunks
   * @param chunkResults Array of chunk results to merge
   * @param tier Chunking tier used (for metadata)
   * @returns Merged result with metadata
   */
  async merge(chunkResults: ChunkResult[], tier: string): Promise<MergedResult> {
    console.log(`[ResultMerger] Merging ${chunkResults.length} chunk results...`);

    // Sort by chunk index to maintain order
    chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex);

    const successfulChunks = chunkResults.filter(r => r.success);
    const failedChunks = chunkResults.filter(r => !r.success);

    console.log(`  Successful chunks: ${successfulChunks.length}`);
    console.log(`  Failed chunks: ${failedChunks.length}`);

    // Extract all data while preserving metadata
    const allData: unknown[] = [];
    const warnings: string[] = [];

    for (const chunk of successfulChunks) {
      // Normalize extracted data
      const normalizedData = this.normalizeExtractedData(chunk.extractedData);

      // Wrap extracted data with source metadata
      const dataWithMetadata = {
        data: normalizedData,
        _chunkMetadata: {
          chunkId: chunk.chunkId,
          chunkIndex: chunk.chunkIndex,
          sourcePages: { start: chunk.startPage, end: chunk.endPage },
          documentIndex: chunk.documentIndex,
          tokensUsed: chunk.tokensUsed,
          cacheHit: chunk.cacheHit,
          confidence: chunk.confidence,
        },
      };

      allData.push(dataWithMetadata);
    }

    // Handle partial failures
    if (failedChunks.length > 0) {
      warnings.push(`${failedChunks.length} chunk(s) failed to process`);

      for (const chunk of failedChunks) {
        const errorMsg = `Chunk ${chunk.chunkIndex} (pages ${chunk.startPage}-${chunk.endPage}): ${chunk.error || 'Unknown error'}`;
        warnings.push(errorMsg);
        console.warn(`[ResultMerger]   ⚠️ ${errorMsg}`);
      }
    }

    // Calculate cache hit rate
    const cacheHits = chunkResults.filter(r => r.cacheHit).length;
    const cacheHitRate = (cacheHits / chunkResults.length) * 100;

    // Calculate total tokens used
    const totalTokensUsed = chunkResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    const metadata: ResultMetadata = {
      totalChunks: chunkResults.length,
      successfulChunks: successfulChunks.length,
      failedChunks: failedChunks.length,
      totalTokensUsed,
      cacheHitRate,
      warnings,
      tier,
    };

    console.log('[ResultMerger] ✓ Merge complete');
    console.log(`  Total items: ${allData.length}`);
    console.log(`  Total tokens: ${totalTokensUsed.toLocaleString()}`);
    console.log(`  Cache hit rate: ${cacheHitRate.toFixed(1)}%`);

    return {
      success: failedChunks.length === 0,
      extractedData: allData,
      metadata,
      errors: failedChunks.map(c => c.error || 'Unknown error'),
    };
  }

  /**
   * Normalize extracted data to handle different formats
   * Claude API may return different structures, normalize to array
   * @param data Raw extracted data from Claude
   * @returns Normalized data structure
   */
  private normalizeExtractedData(data: unknown): unknown {
    // If already an object, return as-is
    if (typeof data === 'object' && data !== null) {
      return data;
    }

    // If string, try to parse as JSON
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        // If not valid JSON, return wrapped
        return { text: data };
      }
    }

    // For other types, wrap in object
    return { value: data };
  }

  /**
   * Merge results with deduplication
   * Useful when chunks might overlap (though not expected with our chunking strategy)
   * @param chunkResults Array of chunk results
   * @param tier Chunking tier
   * @param dedupeKey Key to use for deduplication (e.g., 'id', 'invoice_number')
   * @returns Merged result with duplicates removed
   */
  async mergeWithDeduplication(
    chunkResults: ChunkResult[],
    tier: string,
    dedupeKey: string
  ): Promise<MergedResult> {
    console.log(`[ResultMerger] Merging with deduplication (key: ${dedupeKey})...`);

    // First, do standard merge
    const merged = await this.merge(chunkResults, tier);

    // Then deduplicate
    const seen = new Set<unknown>();
    const dedupedData: unknown[] = [];
    let duplicatesRemoved = 0;

    for (const item of merged.extractedData) {
      if (typeof item === 'object' && item !== null) {
        const keyValue = (item as Record<string, unknown>)[dedupeKey];

        if (keyValue !== undefined) {
          if (seen.has(keyValue)) {
            duplicatesRemoved++;
            console.log(`[ResultMerger]   Removed duplicate: ${dedupeKey}=${keyValue}`);
            continue;
          }

          seen.add(keyValue);
        }
      }

      dedupedData.push(item);
    }

    if (duplicatesRemoved > 0) {
      merged.metadata.warnings.push(
        `Removed ${duplicatesRemoved} duplicate(s) based on key: ${dedupeKey}`
      );
      console.log(`[ResultMerger] ✓ Deduplication complete: ${duplicatesRemoved} duplicates removed`);
    }

    return {
      ...merged,
      extractedData: dedupedData,
    };
  }

  /**
   * Get summary statistics from merged result
   * @param merged Merged result
   * @returns Human-readable summary
   */
  getSummary(merged: MergedResult): string {
    const lines: string[] = [];

    lines.push(`Extraction ${merged.success ? 'completed successfully' : 'completed with errors'}`);
    lines.push(`Items extracted: ${merged.extractedData.length}`);
    lines.push(`Chunks processed: ${merged.metadata.successfulChunks}/${merged.metadata.totalChunks}`);
    lines.push(`Tokens used: ${merged.metadata.totalTokensUsed.toLocaleString()}`);
    lines.push(`Cache hit rate: ${merged.metadata.cacheHitRate.toFixed(1)}%`);
    lines.push(`Chunking tier: ${merged.metadata.tier}`);

    if (merged.metadata.warnings.length > 0) {
      lines.push(`\nWarnings: ${merged.metadata.warnings.length}`);
      merged.metadata.warnings.forEach(w => lines.push(`  - ${w}`));
    }

    if (merged.errors.length > 0) {
      lines.push(`\nErrors: ${merged.errors.length}`);
      merged.errors.forEach(e => lines.push(`  - ${e}`));
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const resultMerger = ResultMerger.getInstance();
