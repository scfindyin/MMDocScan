import { Page } from '../../PDFParser';

/**
 * Test fixture data for DocumentDetector tests
 * Provides helper functions to create test Page arrays with various scenarios
 */

/**
 * Create a single document with no indicators (3 pages)
 * Expected: 1 document (fallback behavior)
 */
export function createSingleDocumentPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'This is page 1 with no special keywords or patterns.',
    },
    {
      pageNumber: 2,
      text: 'This is page 2 continuing the same document without any indicators.',
    },
    {
      pageNumber: 3,
      text: 'This is page 3 still part of the same document with regular text content.',
    },
  ];
}

/**
 * Create three separate documents with invoice keywords
 * Expected: 3 documents, each 1 page, confidence 0.7
 */
export function createThreeDocumentsWithKeywords(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'INVOICE #001\nDate: 01/15/2024\nTotal: $100.00\nThank you for your purchase.',
    },
    {
      pageNumber: 2,
      text: 'Receipt for Coffee\nDate: 01/16/2024\nItem: Latte\nTotal: $5.00',
    },
    {
      pageNumber: 3,
      text: 'Bill for Services\nDate: 01/17/2024\nConsulting Services\nAmount: $200.00',
    },
  ];
}

/**
 * Create pages with invoice keyword in first page only
 * Expected: 2 documents (page 1, pages 2-3)
 */
export function createMixedIndicatorPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Invoice for Services\nDate: 01/15/2024\nAmount: $150.00',
    },
    {
      pageNumber: 2,
      text: 'Continuation of previous document\nMore details here',
    },
    {
      pageNumber: 3,
      text: 'Final page of the document\nThank you',
    },
  ];
}

/**
 * Create pages testing invoice number patterns
 */
export function createInvoiceNumberPatternPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'INV-12345\nCustomer: John Doe\nAmount: $100',
    },
    {
      pageNumber: 2,
      text: 'Order #98765\nDate: 01/15/2024\nTotal: $50',
    },
    {
      pageNumber: 3,
      text: 'Invoice No. 55555\nBilling Information',
    },
  ];
}

/**
 * Create pages testing date patterns
 */
export function createDatePatternPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Document dated 01/15/2024\nSome content here',
    },
    {
      pageNumber: 2,
      text: 'Report for 15-01-2024\nAdditional information',
    },
    {
      pageNumber: 3,
      text: 'Statement 2024-01-15\nFinal details',
    },
  ];
}

/**
 * Create pages with multiple indicators on same page
 * Tests that confidence is max (not cumulative)
 */
export function createMultipleIndicatorsPage(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'INVOICE #12345\nDate: 01/15/2024\nReceipt for purchase\nTotal: $100',
    },
  ];
}

/**
 * Create pages with keyword beyond 200 character limit
 * Expected: Should NOT detect (position requirement)
 */
export function createKeywordBeyond200Chars(): Page[] {
  const padding = 'A'.repeat(210); // 210 characters
  return [
    {
      pageNumber: 1,
      text: padding + 'INVOICE', // "INVOICE" appears at char 210
    },
  ];
}

/**
 * Create pages testing word boundary detection
 * "billion" should NOT match "bill"
 */
export function createWordBoundaryTestPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'The cost is over a billion dollars for this project.',
    },
    {
      pageNumber: 2,
      text: 'Bill for Services\nAmount: $50',
    },
  ];
}

/**
 * Create pages with empty text
 */
export function createEmptyTextPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: '',
    },
    {
      pageNumber: 2,
      text: 'Some content on page 2',
    },
    {
      pageNumber: 3,
      text: '',
    },
  ];
}

/**
 * Create pages with only whitespace
 */
export function createWhitespacePages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: '   \n\n\t  ',
    },
    {
      pageNumber: 2,
      text: 'Actual content here',
    },
  ];
}

/**
 * Create pages with special characters
 */
export function createSpecialCharacterPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'INVOICE @#$%^&*() 12345\nSpecial chars: <>&"\'\n',
    },
    {
      pageNumber: 2,
      text: 'Receipt with émojis 😀 and üñíçödé',
    },
  ];
}

/**
 * Create a single page PDF
 */
export function createSinglePage(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Single page document with some content but no indicators',
    },
  ];
}

/**
 * Create pages where all have indicators
 * AGGRESSIVE strategy should create separate documents
 */
export function createAllPagesWithIndicators(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Invoice #001',
    },
    {
      pageNumber: 2,
      text: 'Receipt dated 01/15/2024',
    },
    {
      pageNumber: 3,
      text: 'Bill INV-12345',
    },
    {
      pageNumber: 4,
      text: 'Order #98765',
    },
  ];
}

/**
 * Create 100-page document for performance testing
 * Mix of pages with and without indicators
 */
export function create100PageDocument(): Page[] {
  const pages: Page[] = [];

  for (let i = 1; i <= 100; i++) {
    // Every 10th page has invoice keyword
    if (i % 10 === 0) {
      pages.push({
        pageNumber: i,
        text: `Invoice #${1000 + i}\nDate: 01/${(i % 28) + 1}/2024\nAmount: $${i * 10}`,
      });
    } else {
      pages.push({
        pageNumber: i,
        text: `Page ${i} content without indicators\nRegular text here\nMore content for testing`,
      });
    }
  }

  return pages;
}

/**
 * Create pages with minimum digit requirement test
 * Invoice numbers need 3+ digits
 */
export function createMinimumDigitTestPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Order #12', // Only 2 digits - should NOT match
    },
    {
      pageNumber: 2,
      text: 'Invoice #123', // 3 digits - should match
    },
    {
      pageNumber: 3,
      text: 'INV-9', // Only 1 digit - should NOT match
    },
    {
      pageNumber: 4,
      text: 'INV-1234', // 4 digits - should match
    },
  ];
}

/**
 * Create ambiguous case with weak indicators
 */
export function createAmbiguousPages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Document with date 01/15/2024 in the middle', // Date only (0.5)
    },
    {
      pageNumber: 2,
      text: 'Continuation with no indicators at all', // Page boundary only (0.3)
    },
    {
      pageNumber: 3,
      text: 'More continuation text here', // Page boundary only (0.3)
    },
  ];
}

/**
 * Create pages testing case insensitivity
 */
export function createCaseInsensitivePages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'INVOICE in uppercase',
    },
    {
      pageNumber: 2,
      text: 'invoice in lowercase',
    },
    {
      pageNumber: 3,
      text: 'InVoIcE in mixed case',
    },
    {
      pageNumber: 4,
      text: 'Receipt IN CAPS',
    },
  ];
}

/**
 * Create pages with unicode and international characters
 */
export function createUnicodePages(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'Factura #12345\nFecha: 01/15/2024', // Spanish
    },
    {
      pageNumber: 2,
      text: '請求書 #98765\n日付: 2024-01-15', // Japanese
    },
    {
      pageNumber: 3,
      text: 'Rechnung №12345\nDatum: 15.01.2024', // German/Cyrillic
    },
  ];
}

/**
 * Create multi-page document with invoice that continues
 * First page has indicator, subsequent pages don't
 */
export function createMultiPageInvoice(): Page[] {
  return [
    {
      pageNumber: 1,
      text: 'INVOICE #12345\nBilling Information\nCustomer: Acme Corp',
    },
    {
      pageNumber: 2,
      text: 'Line items:\n- Item 1: $50\n- Item 2: $100',
    },
    {
      pageNumber: 3,
      text: 'Terms and Conditions\nPayment due in 30 days',
    },
    {
      pageNumber: 4,
      text: 'Thank you for your business',
    },
  ];
}
