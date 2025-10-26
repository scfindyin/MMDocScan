/**
 * Batch Extraction API Endpoint (Story 3.11)
 * POST /api/extractions/batch
 *
 * Accepts multiple PDF files and processes them with rate limiting
 * Returns session ID immediately and processes in background
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase-server';
import PDFParser from '@/lib/services/PDFParser';
import { documentDetector } from '@/lib/services/DocumentDetector';
import { tokenEstimator } from '@/lib/services/TokenEstimator';
import { chunkingStrategy } from '@/lib/services/ChunkingStrategy';
import { rateLimitManager } from '@/lib/services/RateLimitManager';
import { resultMerger } from '@/lib/services/ResultMerger';
import type { ChunkResult } from '@/lib/services/ResultMerger';
import {
  createSession,
  updateSessionStatus,
  updateSessionProgress,
  storeExtractionResult,
} from '@/lib/db/batch-extractions';
import type { TemplateSnapshot, FileMetadata } from '@/lib/db/batch-extractions';

// Set 5-minute timeout for large PDFs
export const maxDuration = 300;

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const templateId = formData.get('template_id') as string;
    const files = formData.getAll('files') as File[];

    console.log('[Batch API] Received batch extraction request');
    console.log(`  User: ${user.id}`);
    console.log(`  Template: ${templateId}`);
    console.log(`  Files: ${files.length}`);

    // Validate inputs
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    // Validate template exists
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Validate file types
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `Only PDF files are supported. Received: ${file.type}` },
          { status: 400 }
        );
      }
    }

    // Create template snapshot
    const templateSnapshot: TemplateSnapshot = {
      id: template.id,
      name: template.name,
      fields: template.fields || [],
      extraction_prompt: template.extraction_prompt || undefined,
    };

    // Create file metadata
    const filesMetadata: FileMetadata[] = files.map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));

    // Create extraction session
    const session = await createSession({
      user_id: user.id,
      template_id: templateId,
      template_snapshot: templateSnapshot,
      files: filesMetadata,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create extraction session' },
        { status: 500 }
      );
    }

    console.log(`[Batch API] ✓ Session created: ${session.id}`);

    // Start background processing (don't await)
    processExtractionSession(session.id, files, templateSnapshot).catch(error => {
      console.error(`[Batch API] Background processing failed for session ${session.id}:`, error);
    });

    // Return immediately
    return NextResponse.json(
      {
        session_id: session.id,
        status: 'queued',
        message: 'Extraction session created successfully',
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('[Batch API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Background Processing
// ============================================================================

async function processExtractionSession(
  sessionId: string,
  files: File[],
  template: TemplateSnapshot
) {
  try {
    console.log(`[Session ${sessionId}] Starting background processing`);
    await updateSessionStatus(sessionId, 'processing');

    const totalFiles = files.length;
    let processedFiles = 0;

    for (const file of files) {
      console.log(`[Session ${sessionId}] Processing file: ${file.name}`);

      try {
        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: Parse PDF (Story 3.9)
        const pdfParser = PDFParser.getInstance();
        const parseResult = await pdfParser.parsePDF(buffer);
        console.log(`[Session ${sessionId}]   ✓ Parsed ${parseResult.pages.length} pages`);

        // Step 2: Detect documents (Story 3.10)
        const detectedDocuments = await documentDetector.detect(parseResult.pages);
        console.log(`[Session ${sessionId}]   ✓ Detected ${detectedDocuments.length} documents`);

        // Step 3: Estimate tokens for text content
        const fullText = parseResult.pages.map(p => p.text).join('\n\n');
        const tokenCount = await tokenEstimator.estimateTextTokens(fullText);
        console.log(`[Session ${sessionId}]   ✓ Estimated ${tokenCount.toLocaleString()} tokens`);

        // Step 4: Determine chunking strategy and create chunks
        const chunkingResult = await chunkingStrategy.determineAndChunk(
          parseResult.pages,
          tokenCount,
          detectedDocuments
        );
        console.log(`[Session ${sessionId}]   ✓ Strategy: ${chunkingResult.tier}, ${chunkingResult.chunks.length} chunks`);

        // Step 5: Process chunks with rate limiting
        const chunkResults: ChunkResult[] = [];

        for (const chunk of chunkingResult.chunks) {
          console.log(`[Session ${sessionId}]   Processing chunk ${chunk.chunkIndex}/${chunk.totalChunks}...`);

          // Estimate tokens for this chunk
          const chunkTokens = await tokenEstimator.estimateTextTokens(chunk.textContent);

          // Check rate limit before proceeding
          await rateLimitManager.canProceed(chunkTokens);

          // Extract with retry logic for 429 errors
          let retryCount = 0;
          let success = false;
          let result: Anthropic.Messages.Message | null = null;

          while (!success && retryCount < 3) {
            try {
              result = await extractWithPromptCaching(
                chunk.textContent,
                template.extraction_prompt || buildDefaultPrompt(template.fields)
              );

              // Track token usage
              rateLimitManager.trackTokenUsage(result.usage.input_tokens);
              rateLimitManager.resetBackoff();
              success = true;

            } catch (error: unknown) {
              if (error instanceof Error && 'status' in error && error.status === 429) {
                console.warn(`[Session ${sessionId}]     ⚠️ 429 error on chunk ${chunk.chunkIndex}, retrying...`);
                await rateLimitManager.handle429Error();
                retryCount++;
              } else {
                throw error;
              }
            }
          }

          if (!success || !result) {
            throw new Error(`Max retries exceeded for chunk ${chunk.chunkIndex}`);
          }

          // Extract text content from Claude response
          const textContent = result.content
            .filter(block => block.type === 'text')
            .map(block => (block as Anthropic.Messages.TextBlock).text)
            .join('\n');

          chunkResults.push({
            chunkId: chunk.chunkId,
            chunkIndex: chunk.chunkIndex,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            documentIndex: chunk.documentIndex,
            extractedData: textContent,
            success: true,
            tokensUsed: result.usage.input_tokens,
            cacheHit: (result.usage.cache_read_input_tokens || 0) > 0,
          });

          console.log(`[Session ${sessionId}]     ✓ Chunk ${chunk.chunkIndex} complete (${result.usage.input_tokens} tokens)`);
        }

        // Step 6: Merge results if chunked
        const mergedResult = await resultMerger.merge(chunkResults, chunkingResult.tier);
        console.log(`[Session ${sessionId}]   ✓ Results merged`);
        console.log(`[Session ${sessionId}]     Success: ${mergedResult.success}`);
        console.log(`[Session ${sessionId}]     Total tokens: ${mergedResult.metadata.totalTokensUsed.toLocaleString()}`);
        console.log(`[Session ${sessionId}]     Cache hit rate: ${mergedResult.metadata.cacheHitRate.toFixed(1)}%`);

        // Step 7: Store results in database
        await storeExtractionResult({
          session_id: sessionId,
          file_id: file.name,
          source_file: file.name,
          extracted_data: mergedResult.extractedData,
          metadata: {
            ...mergedResult.metadata,
            detectedDocuments: detectedDocuments.map(d => ({
              startPage: d.startPage,
              endPage: d.endPage,
              confidence: d.confidence,
            })),
          },
        });

        console.log(`[Session ${sessionId}] ✓ File processed successfully: ${file.name}`);

      } catch (error) {
        console.error(`[Session ${sessionId}] ❌ Error processing ${file.name}:`, error);

        // Store error result
        await storeExtractionResult({
          session_id: sessionId,
          file_id: file.name,
          source_file: file.name,
          extracted_data: {},
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update progress
      processedFiles++;
      const progress = Math.round((processedFiles / totalFiles) * 100);
      await updateSessionProgress(sessionId, progress);
      console.log(`[Session ${sessionId}] Progress: ${progress}% (${processedFiles}/${totalFiles})`);
    }

    // Mark session as completed
    await updateSessionStatus(sessionId, 'completed');
    console.log(`[Session ${sessionId}] ✅ All files processed`);

  } catch (error) {
    console.error(`[Session ${sessionId}] ❌ Fatal error:`, error);
    await updateSessionStatus(sessionId, 'failed');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract with prompt caching enabled
 * @param textContent Text content to extract from
 * @param extractionPrompt Extraction prompt
 * @returns Claude API response
 */
async function extractWithPromptCaching(
  textContent: string,
  extractionPrompt: string
): Promise<Anthropic.Messages.Message> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  // Configure client with betas for prompt caching
  const anthropic = new Anthropic({
    apiKey,
    // @ts-ignore - betas configuration is not in types but works at runtime
    betas: ['prompt-caching-2024-07-31'],
  });

  return await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250926',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: extractionPrompt,
        // @ts-ignore - cache_control is available with prompt caching beta
        cache_control: { type: 'ephemeral' }, // Cache system prompt for 5 minutes
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: textContent,
          },
        ],
      },
    ],
  });
}

/**
 * Build default extraction prompt if none provided
 * @param fields Template fields
 * @returns Default extraction prompt
 */
function buildDefaultPrompt(fields: TemplateSnapshot['fields']): string {
  const fieldList = fields.map(f => `- ${f.name}`).join('\n');

  return `Extract the following fields from the provided document text:

${fieldList}

Return the extracted data as JSON.`;
}
