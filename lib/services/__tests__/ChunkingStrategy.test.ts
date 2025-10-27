/**
 * ChunkingStrategy Unit Tests
 * Story 3.11: Three-Tier Chunking Strategy
 */

import ChunkingStrategy from '../ChunkingStrategy';
import { Page } from '../PDFParser';
import { DetectedDocument } from '../DocumentDetector';
import { TemplateField } from '@/types/template';
import { ChunkingStrategy as ChunkingStrategyEnum } from '@/types/chunking';

describe('ChunkingStrategy', () => {
  let chunker: ChunkingStrategy;

  beforeEach(() => {
    chunker = ChunkingStrategy.getInstance();
  });

  // Helper to create mock pages
  const createMockPages = (count: number, charsPerPage: number = 1000): Page[] => {
    return Array.from({ length: count }, (_, i) => ({
      pageNumber: i + 1,
      text: 'A'.repeat(charsPerPage),
      width: 612,
      height: 792,
    }));
  };

  // Helper to create mock template fields
  const createMockFields = (count: number = 3): TemplateField[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `${i}`,
      name: `field_${i}`,
      order: i,
    }));
  };

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ChunkingStrategy.getInstance();
      const instance2 = ChunkingStrategy.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('WHOLE Strategy Selection', () => {
    it('should select WHOLE strategy for small document', () => {
      // Small document: 5 pages, 1000 chars each = ~1429 tokens total (well under 20k limit)
      const pages = createMockPages(5, 1000);
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 5, pageCount: 5, confidence: 0.9 },
      ];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.WHOLE);
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].startPage).toBe(1);
      expect(result.chunks[0].endPage).toBe(5);
      expect(result.chunks[0].pages).toHaveLength(5);
    });

    it('should select WHOLE strategy when document fits within limit', () => {
      // Medium document: 20 pages, 2000 chars each = ~11,429 tokens total (under 20k limit)
      const pages = createMockPages(20, 2000);
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 20, pageCount: 20, confidence: 0.9 },
      ];
      const fields = createMockFields(5);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.WHOLE);
      expect(result.chunks).toHaveLength(1);
    });
  });

  describe('DOCUMENT_BOUNDARY Strategy Selection', () => {
    it('should select DOCUMENT_BOUNDARY for multi-document PDF', () => {
      // 3 documents, each fitting within limit
      const pages = createMockPages(30, 1000); // 30 pages, ~8571 tokens total
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 10, pageCount: 10, confidence: 0.9 },  // ~2857 tokens
        { startPage: 11, endPage: 20, pageCount: 10, confidence: 0.8 }, // ~2857 tokens
        { startPage: 21, endPage: 30, pageCount: 10, confidence: 0.7 }, // ~2857 tokens
      ];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.DOCUMENT_BOUNDARY);
      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0].startPage).toBe(1);
      expect(result.chunks[0].endPage).toBe(10);
      expect(result.chunks[1].startPage).toBe(11);
      expect(result.chunks[1].endPage).toBe(20);
      expect(result.chunks[2].startPage).toBe(21);
      expect(result.chunks[2].endPage).toBe(30);
    });

    it('should fallback from DOCUMENT_BOUNDARY if chunk exceeds limit', () => {
      // 2 documents, one too large for single chunk
      const pages = createMockPages(100, 3000); // 100 pages, ~85,714 tokens total
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 80, pageCount: 80, confidence: 0.9 },   // ~68,571 tokens (exceeds 20k limit)
        { startPage: 81, endPage: 100, pageCount: 20, confidence: 0.8 }, // ~17,143 tokens
      ];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      // Should fallback to PAGE_SPLIT since DOCUMENT_BOUNDARY chunks exceed limit
      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
    });
  });

  describe('PAGE_SPLIT Strategy Selection', () => {
    it('should select PAGE_SPLIT for large single document', () => {
      // Large document: 100 pages, 3000 chars each = ~85,714 tokens (exceeds limits)
      const pages = createMockPages(100, 3000);
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 100, pageCount: 100, confidence: 0.9 },
      ];
      const fields = createMockFields(5);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
      expect(result.chunks.length).toBeGreaterThan(1);
    });

    it('should split pages into 5-page chunks by default', () => {
      // 23 pages should create 5 chunks (5+5+5+5+3)
      const pages = createMockPages(23, 1000);
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 23, pageCount: 23, confidence: 0.9 },
      ];
      const fields = createMockFields(3);

      // Force PAGE_SPLIT by making WHOLE not viable
      const largePages = createMockPages(23, 10000); // Large chars per page
      const result = chunker.selectStrategy(largePages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
      expect(result.chunks).toHaveLength(5); // 5+5+5+5+3 = 5 chunks
    });

    it('should handle edge case with last chunk having fewer pages', () => {
      const pages = createMockPages(13, 10000); // Force PAGE_SPLIT
      const detectedDocs: DetectedDocument[] = [];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
      expect(result.chunks).toHaveLength(3); // 5+5+3 = 3 chunks
      expect(result.chunks[2].pages).toHaveLength(3); // Last chunk has 3 pages
      expect(result.chunks[2].startPage).toBe(11);
      expect(result.chunks[2].endPage).toBe(13);
    });
  });

  describe('Strategy Fallback Chain', () => {
    it('should try strategies in order: WHOLE → DOCUMENT_BOUNDARY → PAGE_SPLIT', () => {
      // Create scenario where WHOLE fails but DOCUMENT_BOUNDARY succeeds
      const pages = createMockPages(50, 5000); // Too large for WHOLE (~71,429 tokens)
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 25, pageCount: 25, confidence: 0.9 },  // ~35,714 tokens (exceeds limit)
        { startPage: 26, endPage: 50, pageCount: 25, confidence: 0.8 }, // ~35,714 tokens (exceeds limit)
      ];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      // Both WHOLE and DOCUMENT_BOUNDARY should fail, fallback to PAGE_SPLIT
      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom maxTokensPerChunk', () => {
      const pages = createMockPages(10, 1000);
      const detectedDocs: DetectedDocument[] = [];
      const fields = createMockFields(3);

      const customConfig = {
        maxTokensPerChunk: 1000, // Very low limit
      };

      const result = chunker.selectStrategy(pages, detectedDocs, fields, customConfig);

      // Should fallback to PAGE_SPLIT due to low limit
      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
    });

    it('should respect custom pagesPerChunk', () => {
      const pages = createMockPages(10, 10000); // Force PAGE_SPLIT
      const detectedDocs: DetectedDocument[] = [];
      const fields = createMockFields(3);

      const customConfig = {
        pagesPerChunk: 2, // 2 pages per chunk
      };

      const result = chunker.selectStrategy(pages, detectedDocs, fields, customConfig);

      expect(result.strategy).toBe(ChunkingStrategyEnum.PAGE_SPLIT);
      expect(result.chunks).toHaveLength(5); // 10 pages / 2 = 5 chunks
    });
  });

  describe('Recommended Chunk Size', () => {
    it('should calculate recommended chunk size based on page tokens', () => {
      const pages = createMockPages(10, 5000); // ~1429 tokens per page

      const recommendedSize = chunker.getRecommendedChunkSize(pages, 25000);

      // 25000 / 1429 = ~17 pages
      expect(recommendedSize).toBeGreaterThan(10);
      expect(recommendedSize).toBeLessThanOrEqual(20);
    });

    it('should return minimum 1 page per chunk', () => {
      const pages = createMockPages(5, 50000); // Very large pages

      const recommendedSize = chunker.getRecommendedChunkSize(pages, 1000);

      expect(recommendedSize).toBe(1);
    });

    it('should cap at maximum 20 pages per chunk', () => {
      const pages = createMockPages(5, 100); // Very small pages

      const recommendedSize = chunker.getRecommendedChunkSize(pages, 100000);

      expect(recommendedSize).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single page document', () => {
      const pages = createMockPages(1, 1000);
      const detectedDocs: DetectedDocument[] = [
        { startPage: 1, endPage: 1, pageCount: 1, confidence: 0.9 },
      ];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.strategy).toBe(ChunkingStrategyEnum.WHOLE);
      expect(result.chunks).toHaveLength(1);
    });

    it('should handle no detected documents', () => {
      const pages = createMockPages(10, 1000);
      const detectedDocs: DetectedDocument[] = [];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      // Should select WHOLE since document is small
      expect(result.strategy).toBe(ChunkingStrategyEnum.WHOLE);
    });

    it('should handle empty pages array', () => {
      const pages: Page[] = [];
      const detectedDocs: DetectedDocument[] = [];
      const fields = createMockFields(3);

      const result = chunker.selectStrategy(pages, detectedDocs, fields);

      expect(result.chunks).toHaveLength(0);
    });
  });
});
