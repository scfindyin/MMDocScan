/**
 * Chunking Strategy Service (Story 3.11)
 * Implements three-tier chunking strategy based on token count
 *
 * Three Tiers:
 * - Tier 1: <25k tokens = Whole PDF (single API call)
 * - Tier 2: 25k-100k tokens = Document boundary chunking
 * - Tier 3: >100k tokens = Page split chunking (10-15 pages per chunk)
 *
 * CRITICAL: Always respects DocumentDetector boundaries (never splits across documents)
 * IMPLEMENTATION: Text-based chunking (concatenate page.text fields), NOT full PDF slicing
 */

import type { Page, DetectedDocument } from '@/types/pdf';

// Token thresholds for chunking tiers
const TIER_1_THRESHOLD = 25000; // <25k = whole PDF
const TIER_2_THRESHOLD = 100000; // 25k-100k = document boundaries
const PAGE_CHUNK_SIZE = 12; // 10-15 pages per chunk for Tier 3

export enum ChunkTier {
  WHOLE = 'WHOLE',
  DOCUMENT_BOUNDARY = 'DOCUMENT_BOUNDARY',
  PAGE_SPLIT = 'PAGE_SPLIT',
}

export interface ChunkInfo {
  chunkId: string;
  textContent: string; // Concatenated page text (NOT base64 PDF)
  startPage: number; // 1-indexed
  endPage: number; // 1-indexed
  chunkIndex: number; // 0-indexed
  totalChunks: number;
  documentIndex?: number; // Which detected document this chunk belongs to
  tier: ChunkTier;
}

export interface ChunkingResult {
  tier: ChunkTier;
  chunks: ChunkInfo[];
  totalPages: number;
  totalDocuments: number;
}

export class ChunkingStrategy {
  private static instance: ChunkingStrategy;

  private constructor() {
    console.log('[ChunkingStrategy] Initialized');
    console.log(`  Tier 1: <${TIER_1_THRESHOLD.toLocaleString()} tokens (whole PDF)`);
    console.log(`  Tier 2: ${TIER_1_THRESHOLD.toLocaleString()}-${TIER_2_THRESHOLD.toLocaleString()} tokens (document boundaries)`);
    console.log(`  Tier 3: >${TIER_2_THRESHOLD.toLocaleString()} tokens (page split, ${PAGE_CHUNK_SIZE} pages/chunk)`);
  }

  static getInstance(): ChunkingStrategy {
    if (!ChunkingStrategy.instance) {
      ChunkingStrategy.instance = new ChunkingStrategy();
    }
    return ChunkingStrategy.instance;
  }

  /**
   * Determine chunking strategy and create chunks
   * @param pages Page array from PDFParser
   * @param tokenCount Total token count for PDF
   * @param detectedDocuments Document boundaries from DocumentDetector
   * @returns Chunking result with tier and chunks
   */
  async determineAndChunk(
    pages: Page[],
    tokenCount: number,
    detectedDocuments: DetectedDocument[]
  ): Promise<ChunkingResult> {
    const totalPages = pages.length;
    const totalDocuments = detectedDocuments.length;

    console.log('[ChunkingStrategy] Determining strategy...');
    console.log(`  Total pages: ${totalPages}`);
    console.log(`  Total documents: ${totalDocuments}`);
    console.log(`  Estimated tokens: ${tokenCount.toLocaleString()}`);

    // Tier 1: Whole PDF (<25k tokens)
    if (tokenCount < TIER_1_THRESHOLD) {
      console.log('  ✓ Selected: Tier 1 (WHOLE)');
      return this.processWhole(pages, detectedDocuments);
    }

    // Tier 2: Document Boundary (25k-100k tokens)
    if (tokenCount <= TIER_2_THRESHOLD) {
      console.log('  ✓ Selected: Tier 2 (DOCUMENT_BOUNDARY)');
      return this.chunkByDocuments(pages, detectedDocuments);
    }

    // Tier 3: Page Split (>100k tokens)
    console.log('  ✓ Selected: Tier 3 (PAGE_SPLIT)');
    return this.chunkByPages(pages, detectedDocuments);
  }

  /**
   * Tier 1: Process entire PDF as single chunk
   * @param pages All pages
   * @param detectedDocuments Document boundaries (for metadata)
   * @returns Single-chunk result
   */
  private processWhole(
    pages: Page[],
    detectedDocuments: DetectedDocument[]
  ): ChunkingResult {
    const textContent = this.concatenatePageText(pages);

    const chunk: ChunkInfo = {
      chunkId: 'chunk-0',
      textContent,
      startPage: 1,
      endPage: pages.length,
      chunkIndex: 0,
      totalChunks: 1,
      tier: ChunkTier.WHOLE,
    };

    console.log('[ChunkingStrategy] Tier 1: Created single chunk');
    console.log(`  Pages: 1-${pages.length}`);
    console.log(`  Text length: ${textContent.length.toLocaleString()} chars`);

    return {
      tier: ChunkTier.WHOLE,
      chunks: [chunk],
      totalPages: pages.length,
      totalDocuments: detectedDocuments.length,
    };
  }

  /**
   * Tier 2: Chunk by detected document boundaries
   * @param pages All pages
   * @param detectedDocuments Document boundaries
   * @returns One chunk per document
   */
  private chunkByDocuments(
    pages: Page[],
    detectedDocuments: DetectedDocument[]
  ): ChunkingResult {
    const chunks: ChunkInfo[] = [];

    for (let i = 0; i < detectedDocuments.length; i++) {
      const doc = detectedDocuments[i];

      // Extract pages for this document (pages are 1-indexed, array is 0-indexed)
      const docPages = pages.slice(doc.startPage - 1, doc.endPage);
      const textContent = this.concatenatePageText(docPages);

      chunks.push({
        chunkId: `chunk-${i}`,
        textContent,
        startPage: doc.startPage,
        endPage: doc.endPage,
        chunkIndex: i,
        totalChunks: detectedDocuments.length,
        documentIndex: i,
        tier: ChunkTier.DOCUMENT_BOUNDARY,
      });

      console.log(`[ChunkingStrategy] Tier 2: Created chunk ${i}`);
      console.log(`  Document ${i}: Pages ${doc.startPage}-${doc.endPage}`);
      console.log(`  Text length: ${textContent.length.toLocaleString()} chars`);
    }

    return {
      tier: ChunkTier.DOCUMENT_BOUNDARY,
      chunks,
      totalPages: pages.length,
      totalDocuments: detectedDocuments.length,
    };
  }

  /**
   * Tier 3: Split large documents into page chunks
   * @param pages All pages
   * @param detectedDocuments Document boundaries
   * @returns Multiple chunks per document (if needed)
   */
  private chunkByPages(
    pages: Page[],
    detectedDocuments: DetectedDocument[]
  ): ChunkingResult {
    const chunks: ChunkInfo[] = [];
    let chunkIndex = 0;

    for (let docIndex = 0; docIndex < detectedDocuments.length; docIndex++) {
      const doc = detectedDocuments[docIndex];
      const docPageCount = doc.endPage - doc.startPage + 1;

      console.log(`[ChunkingStrategy] Tier 3: Processing document ${docIndex}`);
      console.log(`  Pages ${doc.startPage}-${doc.endPage} (${docPageCount} pages)`);

      // Split document into page chunks
      for (let pageOffset = 0; pageOffset < docPageCount; pageOffset += PAGE_CHUNK_SIZE) {
        const startPage = doc.startPage + pageOffset;
        const endPage = Math.min(startPage + PAGE_CHUNK_SIZE - 1, doc.endPage);

        // Extract pages for this chunk (pages are 1-indexed, array is 0-indexed)
        const chunkPages = pages.slice(startPage - 1, endPage);
        const textContent = this.concatenatePageText(chunkPages);

        chunks.push({
          chunkId: `chunk-${chunkIndex}`,
          textContent,
          startPage,
          endPage,
          chunkIndex,
          totalChunks: 0, // Will be set after all chunks created
          documentIndex: docIndex,
          tier: ChunkTier.PAGE_SPLIT,
        });

        console.log(`  Created chunk ${chunkIndex}: Pages ${startPage}-${endPage}`);
        console.log(`    Text length: ${textContent.length.toLocaleString()} chars`);

        chunkIndex++;
      }
    }

    // Update totalChunks for all chunks
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    console.log(`[ChunkingStrategy] Tier 3: Created ${chunks.length} total chunks`);

    return {
      tier: ChunkTier.PAGE_SPLIT,
      chunks,
      totalPages: pages.length,
      totalDocuments: detectedDocuments.length,
    };
  }

  /**
   * Concatenate page text into single string
   * @param pages Array of Page objects
   * @returns Concatenated text with double newlines between pages
   */
  private concatenatePageText(pages: Page[]): string {
    return pages.map(page => page.text).join('\n\n');
  }

  /**
   * Get recommended tier for token count (without creating chunks)
   * @param tokenCount Estimated tokens
   * @returns Recommended tier
   */
  determineTier(tokenCount: number): ChunkTier {
    if (tokenCount < TIER_1_THRESHOLD) {
      return ChunkTier.WHOLE;
    }
    if (tokenCount <= TIER_2_THRESHOLD) {
      return ChunkTier.DOCUMENT_BOUNDARY;
    }
    return ChunkTier.PAGE_SPLIT;
  }
}

// Export singleton instance
export const chunkingStrategy = ChunkingStrategy.getInstance();
