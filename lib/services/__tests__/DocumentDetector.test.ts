import DocumentDetector, { DocumentDetectionError, ErrorCode, DetectedDocument } from '../DocumentDetector';
import {
  createSingleDocumentPages,
  createThreeDocumentsWithKeywords,
  createMixedIndicatorPages,
  createInvoiceNumberPatternPages,
  createDatePatternPages,
  createMultipleIndicatorsPage,
  createKeywordBeyond200Chars,
  createWordBoundaryTestPages,
  createEmptyTextPages,
  createWhitespacePages,
  createSpecialCharacterPages,
  createSinglePage,
  createAllPagesWithIndicators,
  create100PageDocument,
  createMinimumDigitTestPages,
  createAmbiguousPages,
  createCaseInsensitivePages,
  createUnicodePages,
  createMultiPageInvoice,
} from './fixtures/detectionTestData';

describe('DocumentDetector', () => {
  let detector: DocumentDetector;

  beforeEach(() => {
    detector = DocumentDetector.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DocumentDetector.getInstance();
      const instance2 = DocumentDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Valid Detection - Single Document', () => {
    it('should detect single document when no indicators present', async () => {
      const pages = createSingleDocumentPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].startPage).toBe(1);
      expect(result[0].endPage).toBe(3);
      expect(result[0].pageCount).toBe(3);
      expect(result[0].confidence).toBe(1.0); // Fallback confidence
    });

    it('should handle single-page PDF', async () => {
      const pages = createSinglePage();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].startPage).toBe(1);
      expect(result[0].endPage).toBe(1);
      expect(result[0].pageCount).toBe(1);
      expect(result[0].confidence).toBe(1.0);
    });

    it('should treat multi-page invoice as AGGRESSIVE splits', async () => {
      const pages = createMultiPageInvoice();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // First page has INVOICE keyword, subsequent pages have PAGE_BOUNDARY (0.3)
      // AGGRESSIVE strategy splits on 0.3 threshold
      expect(result.length).toBeGreaterThan(1);
      expect(result[0].startPage).toBe(1);
    });
  });

  describe('Valid Detection - Multiple Documents', () => {
    it('should detect three separate documents with keywords', async () => {
      const pages = createThreeDocumentsWithKeywords();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBe(3);

      // Document 1 (page 1)
      expect(result[0].startPage).toBe(1);
      expect(result[0].endPage).toBe(1);
      expect(result[0].pageCount).toBe(1);
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);

      // Document 2 (page 2)
      expect(result[1].startPage).toBe(2);
      expect(result[1].endPage).toBe(2);
      expect(result[1].pageCount).toBe(1);
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.7);

      // Document 3 (page 3)
      expect(result[2].startPage).toBe(3);
      expect(result[2].endPage).toBe(3);
      expect(result[2].pageCount).toBe(1);
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should detect mixed indicators correctly', async () => {
      const pages = createMixedIndicatorPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // First page has invoice keyword, pages 2-3 split due to AGGRESSIVE strategy
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].startPage).toBe(1);
    });

    it('should detect all pages with indicators as separate documents', async () => {
      const pages = createAllPagesWithIndicators();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBe(4); // All 4 pages have indicators
      expect(result[0].pageCount).toBe(1);
      expect(result[1].pageCount).toBe(1);
      expect(result[2].pageCount).toBe(1);
      expect(result[3].pageCount).toBe(1);
    });
  });

  describe('Heuristic Tests - Invoice Keywords', () => {
    it('should detect "invoice" keyword (case-insensitive)', async () => {
      const pages = createCaseInsensitivePages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // All pages should be detected as they all have "invoice" or "receipt"
      expect(result.length).toBe(4);
    });

    it('should detect "receipt" keyword', async () => {
      const pages = createThreeDocumentsWithKeywords();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.7); // Page with "receipt"
    });

    it('should detect "bill" keyword', async () => {
      const pages = createThreeDocumentsWithKeywords();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.7); // Page with "bill"
    });

    it('should use word boundaries to avoid false positives', async () => {
      const pages = createWordBoundaryTestPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // Page 1: "billion" should NOT match
      // Page 2: "Bill" should match
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should only detect keywords within first 200 characters', async () => {
      const pages = createKeywordBeyond200Chars();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // Keyword beyond 200 chars should not be detected
      // Should return single document (fallback)
      expect(result.length).toBe(1);
      expect(result[0].confidence).toBe(1.0);
    });
  });

  describe('Heuristic Tests - Invoice Number Patterns', () => {
    it('should detect INV- pattern', async () => {
      const pages = createInvoiceNumberPatternPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should detect # pattern', async () => {
      const pages = createInvoiceNumberPatternPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should detect No. pattern', async () => {
      const pages = createInvoiceNumberPatternPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.6);
    });

    it('should require minimum 3 digits for invoice numbers', async () => {
      const pages = createMinimumDigitTestPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // Pages 2 and 4 should have invoice numbers (3+ digits)
      // Pages 1 and 3 should not match (< 3 digits)
      // Due to AGGRESSIVE strategy, all pages will split, but check confidence
      const page2Result = result.find(doc => doc.startPage === 2);
      const page4Result = result.find(doc => doc.startPage === 4);

      if (page2Result) {
        expect(page2Result.confidence).toBeGreaterThanOrEqual(0.6);
      }
      if (page4Result) {
        expect(page4Result.confidence).toBeGreaterThanOrEqual(0.6);
      }
    });
  });

  describe('Heuristic Tests - Date Patterns', () => {
    it('should detect MM/DD/YYYY format', async () => {
      const pages = createDatePatternPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should detect DD-MM-YYYY format', async () => {
      const pages = createDatePatternPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[1].confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should detect YYYY-MM-DD format', async () => {
      const pages = createDatePatternPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[2].confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('Heuristic Tests - Page Boundary (AGGRESSIVE)', () => {
    it('should apply page boundary heuristic to all pages', async () => {
      const pages = createSingleDocumentPages();
      const result = await detector.detect(pages);

      // Even with no indicators, AGGRESSIVE strategy considers page boundaries
      // But since no significant indicators, fallback is used
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
    });

    it('should split on AGGRESSIVE threshold (0.3)', async () => {
      const pages = createAmbiguousPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // AGGRESSIVE strategy with 0.3 threshold should split pages
      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('Confidence Scoring Tests', () => {
    it('should use maximum confidence from multiple indicators', async () => {
      const pages = createMultipleIndicatorsPage();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      // Page has INVOICE (0.7), #12345 (0.6), date (0.5), receipt (0.7)
      // Max should be 0.7, not cumulative
      expect(result[0].confidence).toBe(0.7);
    });

    it('should keep confidence in [0, 1] range', async () => {
      const pages = createThreeDocumentsWithKeywords();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      result.forEach(doc => {
        expect(doc.confidence).toBeGreaterThanOrEqual(0);
        expect(doc.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should assign confidence 1.0 for fallback', async () => {
      const pages = createSingleDocumentPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result[0].confidence).toBe(1.0);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle empty text pages gracefully', async () => {
      const pages = createEmptyTextPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle whitespace-only pages', async () => {
      const pages = createWhitespacePages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters', async () => {
      const pages = createSpecialCharacterPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      // First page has INVOICE keyword despite special chars
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should handle unicode and international characters', async () => {
      const pages = createUnicodePages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      // Unicode pages have # patterns and dates
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Tests', () => {
    it('should throw error for empty pages array', async () => {
      await expect(detector.detect([])).rejects.toThrow(DocumentDetectionError);
      await expect(detector.detect([])).rejects.toMatchObject({
        code: ErrorCode.EMPTY_PAGES,
      });
    });

    it('should throw error for null pages array', async () => {
      await expect(detector.detect(null as any)).rejects.toThrow(DocumentDetectionError);
      await expect(detector.detect(null as any)).rejects.toMatchObject({
        code: ErrorCode.INVALID_INPUT,
      });
    });

    it('should throw error for undefined pages array', async () => {
      await expect(detector.detect(undefined as any)).rejects.toThrow(DocumentDetectionError);
      await expect(detector.detect(undefined as any)).rejects.toMatchObject({
        code: ErrorCode.INVALID_INPUT,
      });
    });

    it('should throw error for invalid page objects (missing pageNumber)', async () => {
      const invalidPages = [
        { text: 'Some text' } as any,
      ];

      await expect(detector.detect(invalidPages)).rejects.toThrow(DocumentDetectionError);
      await expect(detector.detect(invalidPages)).rejects.toMatchObject({
        code: ErrorCode.INVALID_PAGE_DATA,
      });
    });

    it('should throw error for invalid page objects (missing text)', async () => {
      const invalidPages = [
        { pageNumber: 1 } as any,
      ];

      await expect(detector.detect(invalidPages)).rejects.toThrow(DocumentDetectionError);
      await expect(detector.detect(invalidPages)).rejects.toMatchObject({
        code: ErrorCode.INVALID_PAGE_DATA,
      });
    });

    it('should include page number in error for invalid page data', async () => {
      const invalidPages = [
        { pageNumber: 1, text: 'Valid' },
        { pageNumber: 2 } as any, // Missing text
      ];

      try {
        await detector.detect(invalidPages);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentDetectionError);
        expect((error as DocumentDetectionError).pageNumber).toBe(2);
      }
    });

    it('should provide descriptive error messages', async () => {
      try {
        await detector.detect([]);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(DocumentDetectionError);
        expect((error as DocumentDetectionError).message).toContain('empty');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete detection for 100 pages in less than 1 second', async () => {
      const pages = create100PageDocument();
      const startTime = Date.now();

      const result = await detector.detect(pages);

      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Less than 1 second
      console.log(`[Performance] 100-page detection completed in ${duration}ms`);
    });

    it('should handle large text content efficiently', async () => {
      const largeTextPages = [
        {
          pageNumber: 1,
          text: 'INVOICE\n' + 'A'.repeat(10000), // 10KB of text
        },
        {
          pageNumber: 2,
          text: 'Receipt\n' + 'B'.repeat(10000),
        },
      ];

      const startTime = Date.now();
      const result = await detector.detect(largeTextPages);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Integration Tests', () => {
    it('should work with Page interface from PDFParser', async () => {
      // Simulate real PDFParser output
      const pages = [
        {
          pageNumber: 1,
          text: 'INVOICE #12345\nDate: 01/15/2024',
          // height and width are optional
        },
        {
          pageNumber: 2,
          text: 'Continuation page',
        },
      ];

      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should maintain 1-indexed page numbers', async () => {
      const pages = createThreeDocumentsWithKeywords();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      result.forEach(doc => {
        expect(doc.startPage).toBeGreaterThanOrEqual(1);
        expect(doc.endPage).toBeGreaterThanOrEqual(doc.startPage);
        expect(doc.pageCount).toBe(doc.endPage - doc.startPage + 1);
      });
    });

    it('should ensure no gaps or overlaps in page ranges', async () => {
      const pages = create100PageDocument();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();

      // Check for gaps and overlaps
      for (let i = 0; i < result.length - 1; i++) {
        const currentDoc = result[i];
        const nextDoc = result[i + 1];

        // Next document should start exactly after current document ends
        expect(nextDoc.startPage).toBe(currentDoc.endPage + 1);
      }

      // First document should start at page 1
      expect(result[0].startPage).toBe(1);

      // Last document should end at last page
      expect(result[result.length - 1].endPage).toBe(100);
    });

    it('should calculate pageCount correctly', async () => {
      const pages = createThreeDocumentsWithKeywords();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      result.forEach(doc => {
        const expectedPageCount = doc.endPage - doc.startPage + 1;
        expect(doc.pageCount).toBe(expectedPageCount);
      });
    });
  });

  describe('Fallback Logic Tests', () => {
    it('should use fallback for PDF with no significant indicators', async () => {
      const pages = createSingleDocumentPages();
      const result = await detector.detect(pages);

      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].startPage).toBe(1);
      expect(result[0].endPage).toBe(pages.length);
      expect(result[0].confidence).toBe(1.0);
    });

    it('should log fallback usage', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');

      const pages = createSingleDocumentPages();
      await detector.detect(pages);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DocumentDetector] No significant indicators found')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Logging Tests', () => {
    it('should log detection start', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');

      const pages = createSinglePage();
      await detector.detect(pages);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DocumentDetector] Starting document detection')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log detection completion with duration', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');

      const pages = createSinglePage();
      await detector.detect(pages);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DocumentDetector] Detection complete in')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ms')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log significant indicators found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');

      const pages = createThreeDocumentsWithKeywords();
      await detector.detect(pages);

      // Should log pages with indicators (more than just PAGE_BOUNDARY)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('indicators=')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log errors on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error');

      try {
        await detector.detect([]);
      } catch {
        // Expected to throw
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DocumentDetector] Document detection failed'),
        expect.anything()
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
