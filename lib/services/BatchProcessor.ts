/**
 * BatchProcessor Service
 * Story 3.11: Background Processing Logic for Batch Extraction
 *
 * Orchestrates: parse → detect → chunk → extract → complete
 */

import { sessionStore } from './SessionStore';
import { sessionEventEmitter } from './SessionEventEmitter';
import PDFParser from './PDFParser';
import DocumentDetector from './DocumentDetector';
import { chunkingStrategy } from './ChunkingStrategy';
import { rateLimitManager } from './RateLimitManager';
import { tokenEstimator } from './TokenEstimator';
import { ExtractedRow } from '@/types/extraction';
import { CustomColumn } from '@/types/batchExtraction';
import { Page } from './PDFParser';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Process batch extraction in background
 *
 * @param sessionId - Session ID
 */
export async function processBatchExtraction(sessionId: string): Promise<void> {
  const startTime = Date.now();

  try {
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    console.log('[BatchProcessor] Starting batch extraction:', sessionId);

    // Update status to processing
    sessionStore.updateProgress(sessionId, 0, 'processing');
    sessionEventEmitter.emitSessionStarted(sessionId, session.files.length);

    // Phase 1: Parse PDFs
    const parsedFiles = await parsePDFs(sessionId, session.files);

    // Phase 2: Detect documents
    const documentsMap = await detectDocuments(sessionId, parsedFiles);

    // Phase 3: Extract data from all documents
    await extractAllDocuments(
      sessionId,
      documentsMap,
      session.templateSnapshot.fields,
      session.templateSnapshot.extraction_prompt || '',
      session.customColumns
    );

    // Phase 4: Mark complete
    const durationMs = Date.now() - startTime;
    sessionStore.markCompleted(sessionId);

    const finalSession = sessionStore.getSession(sessionId);
    const totalDocuments = Array.from(documentsMap.values()).reduce((sum, docs) => sum + docs.length, 0);

    sessionEventEmitter.emitSessionCompleted(
      sessionId,
      finalSession?.results.length || 0,
      session.files.length,
      totalDocuments,
      durationMs
    );

    console.log('[BatchProcessor] Batch extraction complete:', {
      sessionId,
      durationMs,
      totalRows: finalSession?.results.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BatchProcessor] Batch extraction failed:', errorMessage);

    sessionStore.setError(sessionId, errorMessage);
    sessionEventEmitter.emitSessionFailed(sessionId, errorMessage);
  }
}

/**
 * Parse all PDF files
 */
async function parsePDFs(
  sessionId: string,
  files: any[]
): Promise<Map<string, { pages: Page[]; filename: string }>> {
  const parsedFiles = new Map<string, { pages: Page[]; filename: string }>();

  for (const file of files) {
    try {
      sessionEventEmitter.emitFileParsing(sessionId, file.fileId, file.filename);

      // In real implementation, file.buffer would be available
      // For now, we'll simulate with a placeholder
      // const parser = PDFParser.getInstance();
      // const parseResult = await parser.parsePDF(file.buffer);

      // Placeholder: Create mock pages
      const pages: Page[] = [
        { pageNumber: 1, text: 'Sample page 1', width: 612, height: 792 },
      ];

      parsedFiles.set(file.fileId, {
        pages,
        filename: file.filename,
      });

      sessionEventEmitter.emitFileParsed(sessionId, file.fileId, file.filename, pages.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Parsing failed';
      sessionEventEmitter.emitFileParsingFailed(sessionId, file.fileId, file.filename, errorMessage);
    }
  }

  return parsedFiles;
}

/**
 * Detect documents in parsed PDFs
 */
async function detectDocuments(
  sessionId: string,
  parsedFiles: Map<string, { pages: Page[]; filename: string }>
): Promise<Map<string, any[]>> {
  const documentsMap = new Map<string, any[]>();

  for (const [fileId, { pages, filename }] of Array.from(parsedFiles.entries())) {
    try {
      const detector = DocumentDetector.getInstance();
      const detectedDocs = await detector.detect(pages);
      documentsMap.set(fileId, detectedDocs);

      sessionEventEmitter.emitDocumentDetected(sessionId, fileId, filename, detectedDocs.length);
    } catch (error) {
      console.error('[BatchProcessor] Document detection failed:', fileId, error);
      // Fallback: treat entire file as single document
      documentsMap.set(fileId, [
        { startPage: 1, endPage: pages.length, pageCount: pages.length, confidence: 1.0 },
      ]);
    }
  }

  return documentsMap;
}

/**
 * Extract data from all documents
 */
async function extractAllDocuments(
  sessionId: string,
  documentsMap: Map<string, any[]>,
  fields: any[],
  extractionPrompt: string,
  customColumns: CustomColumn[]
): Promise<void> {
  let documentsProcessed = 0;
  const totalDocuments = Array.from(documentsMap.values()).reduce((sum, docs) => sum + docs.length, 0);

  for (const [fileId, documents] of Array.from(documentsMap.entries())) {
    for (const doc of documents) {
      try {
        const documentId = `${fileId}-doc-${doc.startPage}`;

        sessionEventEmitter.emitExtractionStarted(
          sessionId,
          documentId,
          fileId,
          'filename.pdf',
          'WHOLE'
        );

        // Placeholder extraction (would call Claude API in real implementation)
        const mockResults: ExtractedRow[] = [
          {
            rowId: `${documentId}-row-1`,
            confidence: 0.9,
            fields: { field1: 'value1', field2: 'value2' },
            sourceMetadata: {
              filename: 'file.pdf',
              pageNumber: doc.startPage,
              extractedAt: new Date().toISOString(),
            },
          },
        ];

        // Add custom columns
        for (const row of mockResults) {
          for (const col of customColumns) {
            row.fields[col.columnName] = col.columnValue;
          }
        }

        sessionStore.addResults(sessionId, mockResults);

        documentsProcessed++;
        const progress = Math.round((documentsProcessed / totalDocuments) * 100);

        sessionStore.updateProgress(sessionId, progress, 'processing');
        sessionEventEmitter.emitExtractionProgress(
          sessionId,
          progress,
          documentsProcessed,
          totalDocuments,
          documentsProcessed,
          totalDocuments
        );

        sessionEventEmitter.emitExtractionCompleted(
          sessionId,
          documentId,
          fileId,
          'filename.pdf',
          mockResults.length
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
        console.error('[BatchProcessor] Document extraction failed:', errorMessage);

        sessionEventEmitter.emitExtractionFailed(
          sessionId,
          `${fileId}-doc-${doc.startPage}`,
          fileId,
          'filename.pdf',
          errorMessage
        );
      }
    }
  }
}
