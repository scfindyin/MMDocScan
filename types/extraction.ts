import { z } from 'zod';

/**
 * Source metadata captured during extraction
 */
export interface SourceMetadata {
  filename: string;
  pageNumber?: number;
  extractedAt: string; // ISO 8601 timestamp
}

/**
 * Extracted row with confidence score and denormalized fields
 * Header fields are repeated on each detail row
 */
export interface ExtractedRow {
  rowId: string;
  confidence: number; // 0.0 - 1.0
  fields: Record<string, any>; // Header + detail fields (header repeated per row)
  sourceMetadata: SourceMetadata;
}

/**
 * Production extraction API request schema
 */
export const ProductionExtractionRequestSchema = z.object({
  documentBase64: z.string().min(1, 'Document content is required'),
  templateId: z.string().uuid('Invalid template ID format'),
  customPrompt: z.string().optional(),
  filename: z.string().optional().default('document.pdf'),
});

export type ProductionExtractionRequest = z.infer<typeof ProductionExtractionRequestSchema>;

/**
 * Production extraction API success response
 */
export interface ProductionExtractionSuccessResponse {
  success: true;
  data: ExtractedRow[];
  rowCount: number;
  extractionId?: string; // Story 2.9: Optional extraction ID for navigation to saved extraction
}

/**
 * Production extraction API error response
 */
export interface ProductionExtractionErrorResponse {
  success: false;
  error: string;
  retryable: boolean;
}

export type ProductionExtractionResponse =
  | ProductionExtractionSuccessResponse
  | ProductionExtractionErrorResponse;

/**
 * Test extraction API request schema (for template builder)
 * Receives template fields directly instead of templateId
 */
export const TestExtractionRequestSchema = z.object({
  documentBase64: z.string().min(1, 'Document content is required'),
  templateFields: z.array(z.object({
    field_name: z.string(),
    field_type: z.enum(['text', 'number', 'date', 'currency']),
    is_header: z.boolean(),
  })).min(1, 'At least one field is required'),
  customPrompt: z.string().optional(),
});

export type TestExtractionRequest = z.infer<typeof TestExtractionRequestSchema>;

/**
 * Test extraction API success response
 */
export interface TestExtractionSuccessResponse {
  success: true;
  data: ExtractedRow[];
  rowCount: number;
}

/**
 * Test extraction API error response
 */
export interface TestExtractionErrorResponse {
  success: false;
  error: string;
  retryable: boolean;
}

export type TestExtractionResponse =
  | TestExtractionSuccessResponse
  | TestExtractionErrorResponse;

/**
 * Database extraction record
 * Story 2.9: Extraction Session Management
 */
export interface ExtractionRecord {
  id: string;
  template_id: string;
  filename: string;
  extracted_data: ExtractedRow[];
  row_count: number;
  created_at: string;
}

/**
 * Extraction list item with template name (for recent extractions list)
 */
export interface ExtractionListItem {
  id: string;
  template_id: string;
  template_name: string;
  filename: string;
  row_count: number;
  created_at: string;
}

/**
 * Extraction detail with full extracted data and template info
 */
export interface ExtractionDetail extends ExtractionRecord {
  template_name: string;
}

/**
 * Request to create a new extraction record
 */
export interface CreateExtractionRequest {
  template_id: string;
  filename: string;
  extracted_data: ExtractedRow[];
  row_count: number;
}
