/**
 * PDF-related type definitions (Story 3.11)
 * Consolidated types for PDF parsing, document detection, and batch extraction
 */

// Re-export types from services for easier imports
export type { Page, Metadata, ParseResult } from '@/lib/services/PDFParser';
export type { DetectedDocument } from '@/lib/services/DocumentDetector';
export type { ChunkInfo, ChunkingResult } from '@/lib/services/ChunkingStrategy';
export { ChunkTier } from '@/lib/services/ChunkingStrategy';
