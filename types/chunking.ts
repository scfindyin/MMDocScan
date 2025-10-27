/**
 * Chunking Strategy Types
 * Story 3.11: Three-Tier Chunking Strategy (WHOLE → DOCUMENT_BOUNDARY → PAGE_SPLIT)
 */

import { Page } from '@/lib/services/PDFParser';
import { DetectedDocument } from '@/lib/services/DocumentDetector';

/**
 * Chunking Strategy
 * Priority: WHOLE > DOCUMENT_BOUNDARY > PAGE_SPLIT
 */
export enum ChunkingStrategy {
  WHOLE = 'WHOLE',                       // Single API call for entire document
  DOCUMENT_BOUNDARY = 'DOCUMENT_BOUNDARY', // Split at detected document boundaries
  PAGE_SPLIT = 'PAGE_SPLIT'              // Split into N-page chunks
}

/**
 * Document Chunk
 * Represents a portion of a PDF to be sent to Claude API
 */
export interface DocumentChunk {
  pages: Page[];
  chunkType: ChunkingStrategy;
  startPage: number; // 1-indexed
  endPage: number;   // 1-indexed (inclusive)
  estimatedTokens: number;
}

/**
 * Chunking Result
 * Result of chunking strategy selection
 */
export interface ChunkingResult {
  chunks: DocumentChunk[];
  strategy: ChunkingStrategy;
  estimatedTokens: number; // Max tokens across all chunks
}

/**
 * Chunking Configuration
 * Configuration for chunking strategies
 */
export interface ChunkingConfig {
  maxTokensPerChunk: number;     // Max tokens per chunk (default: 25,000 for safety under 30k limit)
  pagesPerChunk: number;         // Pages per chunk for PAGE_SPLIT strategy (default: 5)
  safetyMargin: number;          // Safety margin multiplier (default: 0.8 = 80% of limit)
}

/**
 * Chunking Strategy Selection Input
 * Input to strategy selection algorithm
 */
export interface ChunkingInput {
  pages: Page[];
  detectedDocuments: DetectedDocument[];
  estimatedTotalTokens: number;
  config: ChunkingConfig;
}
