/**
 * Batch Extraction Session Types
 * Story 3.11: Batch Extraction API with Rate Limit Mitigation & SSE Progress Streaming
 */

import { TemplateField } from './template';
import { ExtractedRow } from './extraction';

/**
 * Session Status
 * Lifecycle: pending → processing → completed/failed
 */
export type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * File Processing Status
 * Lifecycle: pending → parsing → parsed → extracting → completed/failed
 */
export type FileStatus = 'pending' | 'parsing' | 'parsed' | 'extracting' | 'completed' | 'failed';

/**
 * Template Snapshot
 * Immutable copy of template at time of session creation
 */
export interface TemplateSnapshot {
  fields: TemplateField[];
  extraction_prompt: string | null;
}

/**
 * Custom Column Definition
 * Static values to append to each extracted row
 */
export interface CustomColumn {
  columnName: string;
  columnValue: string;
}

/**
 * File Processing Status
 * Tracks processing state for each file in batch
 */
export interface FileProcessingStatus {
  fileId: string;
  filename: string;
  size: number;
  status: FileStatus;
  pageCount?: number;
  detectedDocumentsCount?: number;
  errorMessage?: string;
}

/**
 * Batch Extraction Session
 * In-memory session with 5-minute TTL
 */
export interface BatchExtractionSession {
  sessionId: string;
  templateSnapshot: TemplateSnapshot;
  files: FileProcessingStatus[];
  customColumns: CustomColumn[];
  status: SessionStatus;
  progress: number; // 0-100
  results: ExtractedRow[];
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

/**
 * Create Session Request
 * POST /api/extractions/batch request body
 */
export interface CreateBatchSessionRequest {
  template: TemplateSnapshot;
  files: File[];
  customColumns?: CustomColumn[];
}

/**
 * Create Session Response
 * POST /api/extractions/batch response
 */
export interface CreateBatchSessionResponse {
  sessionId: string;
}

/**
 * Get Session Response
 * GET /api/extractions/batch/:sessionId response
 */
export interface GetBatchSessionResponse {
  session: BatchExtractionSession;
}
