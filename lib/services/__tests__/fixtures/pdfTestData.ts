import * as fs from 'fs';
import * as path from 'path';

/**
 * Test PDF data generators
 * These use real PDF files for testing
 */

/**
 * Load a real test PDF file
 */
export function createSinglePagePDF(): Buffer {
  // Use the TestInvoice.pdf file from fixtures
  const pdfPath = path.join(__dirname, 'TestInvoice.pdf');
  return fs.readFileSync(pdfPath);
}

/**
 * Create a multi-page PDF (reuse TestInvoice for now as it likely has multiple pages)
 */
export function createMultiPagePDF(): Buffer {
  // Use the same TestInvoice.pdf which should have multiple pages
  const pdfPath = path.join(__dirname, 'TestInvoice.pdf');
  return fs.readFileSync(pdfPath);
}

/**
 * Create a PDF with metadata (same as above, real PDFs have metadata)
 */
export function createPDFWithMetadata(): Buffer {
  const pdfPath = path.join(__dirname, 'TestInvoice.pdf');
  return fs.readFileSync(pdfPath);
}

/**
 * Create a corrupted PDF buffer (invalid structure)
 */
export function createCorruptedPDF(): Buffer {
  return Buffer.from('%PDF-1.4\nThis is not a valid PDF structure\n%%EOF', 'utf-8');
}

/**
 * Create a buffer with invalid PDF magic number
 */
export function createInvalidMagicNumber(): Buffer {
  return Buffer.from('NOTAPDF-1.4\nSome content here\n%%EOF', 'utf-8');
}

/**
 * Create a large buffer exceeding size limit (>50MB)
 */
export function createOversizedPDF(): Buffer {
  const size = 51 * 1024 * 1024; // 51MB
  return Buffer.alloc(size, 'X');
}
