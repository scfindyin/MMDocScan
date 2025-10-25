/**
 * Excel Export Service
 * Story 2.7: Excel File Generation
 *
 * Generates .xlsx files from extracted data with formatting, confidence indicators,
 * and source metadata using ExcelJS (client-side execution).
 */

import ExcelJS from 'exceljs';
import { ExtractedRow, SourceMetadata } from '@/types/extraction';
// TODO Story 3.X: Update for Epic 3 schema (FieldType removed, use Template instead of TemplateWithRelations)
import { Template, TemplateField } from '@/types/template';

/**
 * Configuration constants for Excel formatting
 */
const EXCEL_CONFIG = {
  // Column width constraints
  MIN_COLUMN_WIDTH: 10,
  MAX_COLUMN_WIDTH: 50,

  // Confidence threshold for highlighting
  LOW_CONFIDENCE_THRESHOLD: 0.7,

  // Header row styling
  HEADER_BACKGROUND_COLOR: 'FFD3D3D3', // Light gray
  HEADER_FONT_BOLD: true,

  // Low-confidence row highlighting
  LOW_CONFIDENCE_BACKGROUND: 'FFFFFF00', // Yellow

  // Data type formats
  NUMBER_FORMAT: '0.00',
  CURRENCY_FORMAT: '$#,##0.00',
  DATE_FORMAT: 'yyyy-mm-dd',
} as const;

/**
 * Generate Excel file from extracted data
 *
 * @param extractedData - Array of extracted rows with confidence scores and metadata
 * @param template - Template with field definitions for column structure
 * @returns Promise<ExcelJS.Buffer> - Excel file as Buffer for download
 * @throws Error if data is invalid or Excel generation fails
 */
export async function generateExcelFile(
  extractedData: ExtractedRow[],
  template: Template // TODO: Was TemplateWithRelations in Epic 1
): Promise<ExcelJS.Buffer> {
  try {
    // Validate inputs
    if (!extractedData || extractedData.length === 0) {
      throw new Error('No data to export. Extraction results are empty.');
    }

    if (!template.fields || template.fields.length === 0) {
      throw new Error('Template has no fields defined. Cannot generate Excel file.');
    }

    // Create new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Extracted Data');

    // TODO Story 3.X: Epic 3 uses 'order' instead of 'display_order'
    // Sort fields by order for consistent column ordering
    const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

    // Generate column headers: template fields + metadata columns
    // TODO Story 3.X: Epic 3 uses 'name' instead of 'field_name'
    const columnHeaders = [
      ...sortedFields.map(field => field.name),
      'Confidence',
      'Source Filename',
      'Extraction Timestamp',
    ];

    // Add header row
    worksheet.addRow(columnHeaders);

    // Format header row (bold, background color, centered)
    formatHeaderRow(worksheet, columnHeaders.length);

    // Add data rows
    extractedData.forEach((row, rowIndex) => {
      const rowData = [
        // Template field values (already denormalized with header fields repeated)
        ...sortedFields.map(field => {
          // TODO Story 3.X: Epic 3 uses 'name' instead of 'field_name'
          const value = row.fields[field.name];
          // TODO Story 3.X: field_type doesn't exist in Epic 3 TemplateField, needs refactor
          return formatCellValue(value, 'text'); // Default to text for now
        }),
        // Metadata columns
        row.confidence,
        row.sourceMetadata.filename,
        row.sourceMetadata.extractedAt,
      ];

      const excelRow = worksheet.addRow(rowData);

      // Apply data type formatting to cells
      applyCellFormatting(excelRow, sortedFields, columnHeaders.length);

      // Highlight low-confidence rows
      if (row.confidence < EXCEL_CONFIG.LOW_CONFIDENCE_THRESHOLD) {
        highlightLowConfidenceRow(excelRow, columnHeaders.length);
      }
    });

    // Auto-size columns based on content
    autoSizeColumns(worksheet, columnHeaders.length);

    // Generate Excel file in-memory and return Buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;

  } catch (error) {
    // Comprehensive error handling
    if (error instanceof Error) {
      throw new Error(`Excel generation failed: ${error.message}`);
    }
    throw new Error('Excel generation failed due to an unknown error');
  }
}

/**
 * Format the header row with styling
 */
function formatHeaderRow(worksheet: ExcelJS.Worksheet, columnCount: number): void {
  const headerRow = worksheet.getRow(1);

  // Apply styling to each header cell
  for (let i = 1; i <= columnCount; i++) {
    const cell = headerRow.getCell(i);

    // Bold font
    cell.font = {
      bold: EXCEL_CONFIG.HEADER_FONT_BOLD,
    };

    // Background color
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_CONFIG.HEADER_BACKGROUND_COLOR },
    };

    // Center alignment
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };
  }

  // Set header row height for better readability
  headerRow.height = 20;
}

/**
 * Format cell value based on field type
 * Ensures proper data type representation in Excel
 */
function formatCellValue(value: any, fieldType: string): any {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  // TODO Story 3.X: Epic 3 removed FieldType enum
  switch (fieldType) {
    case 'number':
    case 'currency':
      // Convert to number
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      return isNaN(numValue) ? '' : numValue;

    case 'date':
      // Keep as string (will be formatted by Excel)
      return value;

    case 'text':
    default:
      // Return as string
      return String(value);
  }
}

/**
 * Apply cell formatting based on field types
 */
function applyCellFormatting(
  row: ExcelJS.Row,
  fields: TemplateField[],
  totalColumns: number
): void {
  fields.forEach((field, index) => {
    const cell = row.getCell(index + 1);

    // TODO Story 3.X: Epic 3 TemplateField doesn't have field_type
    // Comment out formatting until field types are added back
    /*
    switch (field.field_type) {
      case 'number':
        cell.numFmt = EXCEL_CONFIG.NUMBER_FORMAT;
        break;

      case 'currency':
        cell.numFmt = EXCEL_CONFIG.CURRENCY_FORMAT;
        break;

      case 'date':
        cell.numFmt = EXCEL_CONFIG.DATE_FORMAT;
        break;

      case 'text':
      default:
        // Default text format (no special formatting)
        break;
    }
    */
  });

  // Format confidence column (number with 2 decimal places)
  const confidenceCell = row.getCell(fields.length + 1);
  confidenceCell.numFmt = '0.00';
}

/**
 * Highlight low-confidence rows with yellow/orange background
 */
function highlightLowConfidenceRow(row: ExcelJS.Row, columnCount: number): void {
  for (let i = 1; i <= columnCount; i++) {
    const cell = row.getCell(i);

    // Apply yellow background fill
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_CONFIG.LOW_CONFIDENCE_BACKGROUND },
    };
  }
}

/**
 * Auto-size columns based on content length
 * Applies min/max width constraints for readability
 */
function autoSizeColumns(worksheet: ExcelJS.Worksheet, columnCount: number): void {
  for (let i = 1; i <= columnCount; i++) {
    const column = worksheet.getColumn(i);

    // Calculate max content length in this column
    let maxLength = 0;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      maxLength = Math.max(maxLength, cellValue.length);
    });

    // Apply width with constraints
    // Add padding factor (1.2) for better readability
    const calculatedWidth = maxLength * 1.2;
    column.width = Math.max(
      EXCEL_CONFIG.MIN_COLUMN_WIDTH,
      Math.min(calculatedWidth, EXCEL_CONFIG.MAX_COLUMN_WIDTH)
    );
  }
}
