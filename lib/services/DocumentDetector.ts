import { Page } from './PDFParser';

// ===========================
// Type Definitions
// ===========================

/**
 * Represents a detected document within a multi-document PDF
 */
export interface DetectedDocument {
  startPage: number;      // 1-indexed starting page
  endPage: number;        // 1-indexed ending page (inclusive)
  pageCount: number;      // Derived: endPage - startPage + 1
  confidence: number;     // Confidence score [0, 1]
}

/**
 * Internal type for page-level detection results
 */
interface DetectionResult {
  pageNumber: number;     // 1-indexed page number
  indicators: string[];   // List of matched heuristics
  confidence: number;     // Maximum confidence from all indicators
}

/**
 * Detection strategy enum
 */
export enum DetectionStrategy {
  AGGRESSIVE = 'AGGRESSIVE',     // Prefer false positives (v1 default)
  BALANCED = 'BALANCED',         // Balanced approach (future)
  CONSERVATIVE = 'CONSERVATIVE', // Prefer false negatives (future)
}

/**
 * Error codes for document detection failures
 */
export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  EMPTY_PAGES = 'EMPTY_PAGES',
  DETECTION_FAILED = 'DETECTION_FAILED',
  INVALID_PAGE_DATA = 'INVALID_PAGE_DATA',
}

/**
 * Custom error class for document detection failures
 */
export class DocumentDetectionError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public pageNumber?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DocumentDetectionError';
  }
}

// ===========================
// DocumentDetector Service (Singleton)
// ===========================

/**
 * DocumentDetector Service
 *
 * Automatically detects document boundaries in multi-document PDFs using
 * heuristic-based analysis. Uses AGGRESSIVE detection strategy to prefer
 * over-splitting (false positives) over under-splitting (false negatives).
 *
 * @example
 * ```typescript
 * const detector = DocumentDetector.getInstance();
 * const parseResult = await pdfParser.parsePDF(buffer);
 * const documents = await detector.detect(parseResult.pages);
 * ```
 */
class DocumentDetector {
  private static instance: DocumentDetector;

  // Heuristic configuration
  private readonly KEYWORDS = ['invoice', 'receipt', 'bill'];

  private readonly INVOICE_NUMBER_PATTERNS = [
    /INV-?\d{3,}/i,      // INV-12345, INV12345
    /#\s?\d{3,}/,        // #12345, # 12345
    /No\.?\s?\d{3,}/i,   // No. 12345, No 12345
  ];

  private readonly DATE_PATTERNS = [
    /\d{2}\/\d{2}\/\d{4}/,  // MM/DD/YYYY
    /\d{2}-\d{2}-\d{4}/,    // DD-MM-YYYY
    /\d{4}-\d{2}-\d{2}/,    // YYYY-MM-DD
  ];

  // Confidence scores for each heuristic
  private readonly CONFIDENCE_SCORES = {
    KEYWORD: 0.7,
    INVOICE_NUMBER: 0.6,
    DATE_PATTERN: 0.5,
    PAGE_BOUNDARY: 0.3,
  };

  // AGGRESSIVE strategy threshold
  private readonly AGGRESSIVE_THRESHOLD = 0.3;

  // Header text analysis length
  private readonly HEADER_TEXT_LENGTH = 200;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of DocumentDetector
   */
  public static getInstance(): DocumentDetector {
    if (!DocumentDetector.instance) {
      DocumentDetector.instance = new DocumentDetector();
    }
    return DocumentDetector.instance;
  }

  /**
   * Detect document boundaries in a multi-page PDF
   *
   * Analyzes pages using multiple heuristics to identify document boundaries:
   * - Invoice/Receipt Keywords (confidence 0.7)
   * - Invoice Number Patterns (confidence 0.6)
   * - Date Patterns (confidence 0.5)
   * - Page Boundary (confidence 0.3, AGGRESSIVE strategy)
   *
   * @param pages Array of parsed pages from PDFParser
   * @returns Array of detected documents with boundaries and confidence scores
   * @throws DocumentDetectionError for invalid input or detection failures
   */
  public async detect(pages: Page[]): Promise<DetectedDocument[]> {
    const startTime = Date.now();
    console.log(`[DocumentDetector] Starting document detection for ${pages?.length || 0} pages`);

    try {
      // Validate input
      this.validateInput(pages);

      // Step 1: Analyze each page for indicators
      const detectionResults: DetectionResult[] = pages.map((page) =>
        this.analyzePage(page)
      );

      // Step 2: Determine document boundaries
      const documents = this.determineDocumentBoundaries(detectionResults, pages.length);

      // Step 3: Apply fallback if no documents detected
      const finalDocuments = documents.length > 0
        ? documents
        : [this.createFallbackDocument(pages.length)];

      const duration = Date.now() - startTime;
      console.log(
        `[DocumentDetector] Detection complete in ${duration}ms: ${finalDocuments.length} document(s) detected`
      );

      return finalDocuments;

    } catch (error) {
      console.error('[DocumentDetector] Document detection failed:', error);

      if (error instanceof DocumentDetectionError) {
        throw error;
      }

      throw new DocumentDetectionError(
        'Detection failed',
        ErrorCode.DETECTION_FAILED,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(pages: Page[]): void {
    if (!pages) {
      throw new DocumentDetectionError(
        'Pages array cannot be null or undefined',
        ErrorCode.INVALID_INPUT
      );
    }

    if (pages.length === 0) {
      throw new DocumentDetectionError(
        'Pages array cannot be empty',
        ErrorCode.EMPTY_PAGES
      );
    }

    // Validate each page has required properties
    pages.forEach((page, index) => {
      if (typeof page.pageNumber !== 'number') {
        throw new DocumentDetectionError(
          `Page at index ${index} has invalid pageNumber`,
          ErrorCode.INVALID_PAGE_DATA,
          index
        );
      }

      if (typeof page.text !== 'string') {
        throw new DocumentDetectionError(
          `Page ${page.pageNumber} has invalid text property`,
          ErrorCode.INVALID_PAGE_DATA,
          page.pageNumber
        );
      }
    });
  }

  /**
   * Analyze a single page for document boundary indicators
   */
  private analyzePage(page: Page): DetectionResult {
    const indicators: string[] = [];
    let maxConfidence = 0;

    // Extract header text (first 200 characters)
    const headerText = this.extractHeaderText(page.text);

    // Run all heuristics
    if (this.detectInvoiceKeywords(headerText)) {
      indicators.push('KEYWORD');
      maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.KEYWORD);
    }

    if (this.detectInvoiceNumber(headerText)) {
      indicators.push('INVOICE_NUMBER');
      maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.INVOICE_NUMBER);
    }

    if (this.detectDatePattern(headerText)) {
      indicators.push('DATE_PATTERN');
      maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.DATE_PATTERN);
    }

    // AGGRESSIVE strategy: Always consider page boundary
    indicators.push('PAGE_BOUNDARY');
    maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.PAGE_BOUNDARY);

    // Log significant indicators (more than just PAGE_BOUNDARY)
    if (indicators.length > 1) {
      console.log(
        `[DocumentDetector] Page ${page.pageNumber}: indicators=[${indicators.join(', ')}], confidence=${maxConfidence.toFixed(2)}`
      );
    }

    return {
      pageNumber: page.pageNumber,
      indicators,
      confidence: maxConfidence,
    };
  }

  /**
   * Extract first N characters from text for header analysis
   */
  private extractHeaderText(text: string): string {
    if (!text) return '';
    return text.substring(0, this.HEADER_TEXT_LENGTH).toLowerCase();
  }

  /**
   * Detect invoice/receipt/bill keywords with word boundaries
   */
  private detectInvoiceKeywords(headerText: string): boolean {
    return this.KEYWORDS.some((keyword) => {
      // Use word boundary to avoid false positives like "billion"
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(headerText);
    });
  }

  /**
   * Detect invoice number patterns (INV-, #, No.)
   */
  private detectInvoiceNumber(headerText: string): boolean {
    return this.INVOICE_NUMBER_PATTERNS.some((pattern) =>
      pattern.test(headerText)
    );
  }

  /**
   * Detect date patterns (MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD)
   */
  private detectDatePattern(headerText: string): boolean {
    return this.DATE_PATTERNS.some((pattern) => pattern.test(headerText));
  }

  /**
   * Determine document boundaries from page-level detection results
   *
   * AGGRESSIVE strategy: Split on confidence >= 0.3
   * - First page always starts a document
   * - Pages with confidence >= threshold start new documents
   * - Consecutive pages below threshold are grouped together
   */
  private determineDocumentBoundaries(
    results: DetectionResult[],
    totalPages: number
  ): DetectedDocument[] {
    const documents: DetectedDocument[] = [];

    // Check if we have any significant indicators (beyond just PAGE_BOUNDARY)
    const hasSignificantIndicators = results.some(result =>
      result.indicators.some(ind => ind !== 'PAGE_BOUNDARY')
    );

    // If no significant indicators found across entire PDF, use fallback
    if (!hasSignificantIndicators) {
      return [];
    }

    let currentDocStart = 1;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const isLastPage = i === results.length - 1;

      // Check if this page should start a new document
      // Don't split on first page, and must meet confidence threshold
      const shouldSplit =
        result.confidence >= this.AGGRESSIVE_THRESHOLD &&
        i > 0;

      if (shouldSplit) {
        // Close current document
        const endPage = result.pageNumber - 1;
        documents.push({
          startPage: currentDocStart,
          endPage: endPage,
          pageCount: endPage - currentDocStart + 1,
          confidence: this.getDocumentConfidence(results, currentDocStart - 1, i - 1),
        });

        // Start new document
        currentDocStart = result.pageNumber;
      }

      // Handle last page
      if (isLastPage) {
        documents.push({
          startPage: currentDocStart,
          endPage: result.pageNumber,
          pageCount: result.pageNumber - currentDocStart + 1,
          confidence: this.getDocumentConfidence(results, currentDocStart - 1, i),
        });
      }
    }

    return documents;
  }

  /**
   * Calculate confidence for a document spanning multiple pages
   * Uses maximum confidence from all pages in the range
   */
  private getDocumentConfidence(
    results: DetectionResult[],
    startIndex: number,
    endIndex: number
  ): number {
    let maxConfidence = 0;
    for (let i = startIndex; i <= endIndex; i++) {
      maxConfidence = Math.max(maxConfidence, results[i].confidence);
    }
    return maxConfidence;
  }

  /**
   * Create fallback document for PDFs with no indicators
   * Returns single document spanning all pages with confidence 1.0
   */
  private createFallbackDocument(totalPages: number): DetectedDocument {
    console.log('[DocumentDetector] No significant indicators found, using fallback (single document)');
    return {
      startPage: 1,
      endPage: totalPages,
      pageCount: totalPages,
      confidence: 1.0, // High confidence it's a single document
    };
  }
}

// Export singleton instance and class
export const documentDetector = DocumentDetector.getInstance();
export default DocumentDetector;
