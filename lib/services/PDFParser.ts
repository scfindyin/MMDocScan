import pdfParse from 'pdf-parse';

// ===========================
// Type Definitions
// ===========================

export interface Page {
  pageNumber: number;
  text: string;
  height?: number; // optional, deferred to Story 3.10+
  width?: number; // optional, deferred to Story 3.10+
}

export interface Metadata {
  pageCount: number;
  title?: string;
  author?: string;
  createdDate?: string;
}

export interface ParseResult {
  pages: Page[];
  metadata: Metadata;
  parseTime: number;
}

export enum ErrorCode {
  INVALID_PDF_FORMAT = 'INVALID_PDF_FORMAT',
  CORRUPTED_PDF = 'CORRUPTED_PDF',
  PASSWORD_PROTECTED = 'PASSWORD_PROTECTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PARSING_FAILED = 'PARSING_FAILED',
  UNSUPPORTED_PDF_VERSION = 'UNSUPPORTED_PDF_VERSION',
  PARSING_TIMEOUT = 'PARSING_TIMEOUT'
}

export class PDFParsingError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PDFParsingError';
  }
}

// ===========================
// PDFParser Service (Singleton)
// ===========================

class PDFParser {
  private static instance: PDFParser;
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly PARSING_TIMEOUT = 15000; // 15 seconds
  private readonly PDF_MAGIC_NUMBER = '%PDF';

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): PDFParser {
    if (!PDFParser.instance) {
      PDFParser.instance = new PDFParser();
    }
    return PDFParser.instance;
  }

  /**
   * Parse a PDF file buffer and extract text content with metadata
   * @param buffer - PDF file as Buffer
   * @returns ParseResult with pages, metadata, and parse time
   * @throws PDFParsingError for various parsing failures
   */
  public async parsePDF(buffer: Buffer): Promise<ParseResult> {
    const startTime = Date.now();
    console.log('[PDFParser] Starting PDF parsing');

    try {
      // Validation: File size
      this.validateFileSize(buffer);

      // Validation: Magic number (PDF signature)
      this.validateMagicNumber(buffer);

      // Parse with timeout
      const pdfData = await this.parseWithTimeout(buffer);

      // Extract pages
      const pages = this.extractPages(pdfData);

      // Extract metadata
      const metadata = this.extractMetadata(pdfData);

      const parseTime = Date.now() - startTime;
      console.log(`[PDFParser] PDF parsing completed in ${parseTime}ms (${metadata.pageCount} pages)`);

      return {
        pages,
        metadata,
        parseTime
      };

    } catch (error) {
      console.error('[PDFParser] Parsing failed:', error);

      if (error instanceof PDFParsingError) {
        throw error;
      }

      // Handle known pdf-parse error patterns
      const errorMessage = (error as Error).message?.toLowerCase() || '';

      if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
        throw new PDFParsingError(
          'PDF is password protected or encrypted',
          ErrorCode.PASSWORD_PROTECTED,
          error as Error
        );
      }

      if (errorMessage.includes('invalid') || errorMessage.includes('not a pdf')) {
        throw new PDFParsingError(
          'Invalid PDF format',
          ErrorCode.INVALID_PDF_FORMAT,
          error as Error
        );
      }

      if (errorMessage.includes('unsupported') || errorMessage.includes('version')) {
        throw new PDFParsingError(
          'Unsupported PDF version',
          ErrorCode.UNSUPPORTED_PDF_VERSION,
          error as Error
        );
      }

      if (errorMessage.includes('corrupt')) {
        throw new PDFParsingError(
          'PDF file is corrupted',
          ErrorCode.CORRUPTED_PDF,
          error as Error
        );
      }

      // Generic parsing failure
      throw new PDFParsingError(
        'Failed to parse PDF',
        ErrorCode.PARSING_FAILED,
        error as Error
      );
    }
  }

  /**
   * Validate file size is within limits
   */
  private validateFileSize(buffer: Buffer): void {
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new PDFParsingError(
        `File size ${buffer.length} exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`,
        ErrorCode.FILE_TOO_LARGE
      );
    }
  }

  /**
   * Validate PDF magic number signature
   */
  private validateMagicNumber(buffer: Buffer): void {
    const header = buffer.slice(0, 4).toString('utf-8');
    if (!header.startsWith(this.PDF_MAGIC_NUMBER)) {
      throw new PDFParsingError(
        'File does not have valid PDF signature',
        ErrorCode.INVALID_PDF_FORMAT
      );
    }
  }

  /**
   * Parse PDF with timeout protection
   */
  private async parseWithTimeout(buffer: Buffer): Promise<any> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new PDFParsingError(
          `PDF parsing exceeded timeout of ${this.PARSING_TIMEOUT}ms`,
          ErrorCode.PARSING_TIMEOUT
        ));
      }, this.PARSING_TIMEOUT);
    });

    const parsePromise = pdfParse(buffer);

    return Promise.race([parsePromise, timeoutPromise]);
  }

  /**
   * Extract pages from parsed PDF data
   */
  private extractPages(pdfData: any): Page[] {
    const pages: Page[] = [];

    // pdf-parse returns text as a single string
    // We need to split by page breaks or use the numpages info
    const fullText = pdfData.text || '';
    const pageCount = pdfData.numpages || 1;

    // Simple approach: if we have page rendering info, use it
    // Otherwise, split text evenly or return as single page
    if (pdfData.pages && Array.isArray(pdfData.pages)) {
      pdfData.pages.forEach((page: any, index: number) => {
        pages.push({
          pageNumber: index + 1,
          text: page.text || '',
          // height and width are optional, deferred to Story 3.10+
        });
      });
    } else {
      // Fallback: split text by form feed character or treat as single block
      const pageTexts = this.splitTextIntoPages(fullText, pageCount);
      pageTexts.forEach((text, index) => {
        pages.push({
          pageNumber: index + 1,
          text: text.trim(),
        });
      });
    }

    return pages;
  }

  /**
   * Split text into pages (simple heuristic)
   */
  private splitTextIntoPages(text: string, pageCount: number): string[] {
    // Try splitting by form feed character first
    const formFeedSplit = text.split('\f');
    if (formFeedSplit.length === pageCount) {
      return formFeedSplit;
    }

    // If page count matches, use form feed split anyway
    if (formFeedSplit.length > 1) {
      return formFeedSplit;
    }

    // Fallback: return entire text as single page
    return [text];
  }

  /**
   * Extract metadata from parsed PDF data
   */
  private extractMetadata(pdfData: any): Metadata {
    const metadata: Metadata = {
      pageCount: pdfData.numpages || 0,
    };

    // Extract optional metadata fields
    if (pdfData.info) {
      if (pdfData.info.Title) {
        metadata.title = pdfData.info.Title;
      }
      if (pdfData.info.Author) {
        metadata.author = pdfData.info.Author;
      }
      if (pdfData.info.CreationDate) {
        metadata.createdDate = this.formatPDFDate(pdfData.info.CreationDate);
      }
    }

    return metadata;
  }

  /**
   * Format PDF date string to ISO format
   */
  private formatPDFDate(pdfDate: string): string {
    try {
      // PDF dates are in format: D:YYYYMMDDHHmmSSOHH'mm'
      if (pdfDate.startsWith('D:')) {
        const dateStr = pdfDate.substring(2, 16); // YYYYMMDDHHmmSS
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = dateStr.substring(8, 10);
        const minute = dateStr.substring(10, 12);
        const second = dateStr.substring(12, 14);

        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).toISOString();
      }
      return pdfDate;
    } catch {
      return pdfDate;
    }
  }
}

export default PDFParser;
