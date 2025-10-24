import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getTemplateById } from '@/lib/db/templates';
import { createExtraction } from '@/lib/db/extractions';
import {
  ProductionExtractionRequestSchema,
  ProductionExtractionResponse,
  ProductionExtractionSuccessResponse,
  ExtractedRow,
} from '@/types/extraction';
import { TemplateField } from '@/types/template';

/**
 * Calculate confidence score for an extracted row
 * Based on field completeness and data type validation
 */
function calculateConfidence(
  fields: Record<string, any>,
  templateFields: TemplateField[]
): number {
  const totalFields = templateFields.length;
  if (totalFields === 0) return 1.0;

  let populatedFields = 0;
  let typeValidFields = 0;

  for (const templateField of templateFields) {
    const value = fields[templateField.field_name];

    // Check if field is populated
    if (value !== null && value !== undefined && value !== '') {
      populatedFields++;

      // Validate data type
      const isValid = validateFieldType(value, templateField.field_type);
      if (isValid) {
        typeValidFields++;
      }
    }
  }

  // Completeness factor: percentage of fields populated
  const completenessFactor = populatedFields / totalFields;

  // Type validity factor: percentage of populated fields with correct type
  const typeValidityFactor =
    populatedFields > 0 ? typeValidFields / populatedFields : 1.0;

  // Combined confidence score
  return completenessFactor * typeValidityFactor;
}

/**
 * Validate field value matches expected type
 * NOTE: All values are strings now, so validation checks if they contain valid data
 */
function validateFieldType(value: any, fieldType: string): boolean {
  if (!value || value === '') return false;

  switch (fieldType) {
    case 'number':
    case 'currency':
      // Allow formatted numbers: "1,234.56", "$1,234.56", etc.
      // Strip common formatting characters and check if result is numeric
      const numStr = String(value).replace(/[$,\s]/g, '');
      return !isNaN(parseFloat(numStr)) && numStr.trim() !== '';
    case 'date':
      // Allow various date formats
      return !isNaN(Date.parse(String(value)));
    case 'text':
      return typeof value === 'string' && value.trim() !== '';
    default:
      return true;
  }
}

/**
 * Denormalize data: repeat header fields on each detail row
 */
function denormalizeData(
  headerFields: Record<string, any>,
  detailRows: Record<string, any>[],
  templateFields: TemplateField[],
  filename: string
): ExtractedRow[] {
  const results: ExtractedRow[] = [];

  // If no detail rows, create a single row with header fields only
  if (detailRows.length === 0) {
    const allFields = { ...headerFields };
    const confidence = calculateConfidence(allFields, templateFields);

    results.push({
      rowId: crypto.randomUUID(),
      confidence,
      fields: allFields,
      sourceMetadata: {
        filename,
        extractedAt: new Date().toISOString(),
      },
    });
  } else {
    // For each detail row, merge with header fields
    detailRows.forEach((detailRow, index) => {
      const allFields = {
        ...headerFields, // Header fields repeated
        ...detailRow, // Detail fields unique to this row
      };

      const confidence = calculateConfidence(allFields, templateFields);

      results.push({
        rowId: crypto.randomUUID(),
        confidence,
        fields: allFields,
        sourceMetadata: {
          filename,
          pageNumber: detailRow.page_number,
          extractedAt: new Date().toISOString(),
        },
      });
    });
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = ProductionExtractionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          retryable: false,
        } satisfies ProductionExtractionResponse,
        { status: 400 }
      );
    }

    const { documentBase64, templateId, customPrompt, filename } = validationResult.data;

    // Fetch template from database
    const template = await getTemplateById(templateId);

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template not found',
          retryable: false,
        } satisfies ProductionExtractionResponse,
        { status: 404 }
      );
    }

    if (!template.fields || template.fields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template has no fields defined',
          retryable: false,
        } satisfies ProductionExtractionResponse,
        { status: 400 }
      );
    }

    // Check API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not configured in environment variables');
      return NextResponse.json(
        {
          success: false,
          error: 'AI service not configured. Please contact support.',
          retryable: false,
        } satisfies ProductionExtractionResponse,
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Separate header and detail fields
    const headerFields = template.fields.filter((f) => f.is_header);
    const detailFields = template.fields.filter((f) => !f.is_header);

    // Build extraction schema for tool calling
    // NOTE: All fields are type 'string' to allow formatting per user instructions
    const extractionSchema = {
      type: 'object',
      properties: {
        header_fields: {
          type: 'object',
          properties: Object.fromEntries(
            headerFields.map((f) => [
              f.field_name,
              {
                type: 'string',
                description: `Extract ${f.field_name} (${f.field_type}) from document following user formatting instructions`,
              },
            ])
          ),
        },
        detail_rows: {
          type: 'array',
          items: {
            type: 'object',
            properties: Object.fromEntries(
              detailFields.map((f) => [
                f.field_name,
                {
                  type: 'string',
                  description: `Extract ${f.field_name} (${f.field_type}) from line item following user formatting instructions`,
                },
              ])
            ),
          },
        },
      },
      required: ['header_fields', 'detail_rows'],
    };

    // Build extraction prompt with improved structure and additive mode
    let extractionPrompt = 'IMPORTANT: Follow these instructions precisely and completely.\n\n';

    // 1. Custom instructions FIRST (highest priority if provided)
    if (customPrompt && customPrompt.trim()) {
      extractionPrompt += 'PRIMARY EXTRACTION INSTRUCTIONS:\n';
      extractionPrompt += `${customPrompt.trim()}\n\n`;
    }

    // 2. Template prompts (always include if exist - additive mode)
    if (template.prompts && template.prompts.length > 0) {
      extractionPrompt += 'TEMPLATE GUIDANCE:\n';
      template.prompts.forEach((p) => {
        extractionPrompt += `${p.prompt_text}\n`;
      });
      extractionPrompt += '\n';
    }

    // 3. Field list
    extractionPrompt += 'Extract structured data from this document based on the following template:\n\n';

    if (headerFields.length > 0) {
      extractionPrompt += 'Header Fields (document-level information):\n';
      headerFields.forEach((f) => {
        extractionPrompt += `- ${f.field_name} (${f.field_type})\n`;
      });
      extractionPrompt += '\n';
    }

    if (detailFields.length > 0) {
      extractionPrompt += 'Detail Fields (line items or repeating information):\n';
      detailFields.forEach((f) => {
        extractionPrompt += `- ${f.field_name} (${f.field_type})\n`;
      });
      extractionPrompt += '\n';
    }

    // 4. Formatting emphasis and final instructions
    extractionPrompt += 'CRITICAL EXTRACTION REQUIREMENTS:\n';
    extractionPrompt += '- ALL fields must be returned as strings to allow custom formatting\n';
    extractionPrompt += '- FOLLOW ALL USER FORMATTING INSTRUCTIONS EXACTLY - they override defaults\n';
    extractionPrompt += '- If user specifies number formatting (commas, separators), apply it precisely\n';
    extractionPrompt += '- If user specifies date format (mm-dd-yyyy, YYYY-MM-DD, etc.), use that exact format\n';
    extractionPrompt += '- If user specifies currency formatting, include symbols and separators as requested\n';
    extractionPrompt += '- Default formatting (when no instructions given):\n';
    extractionPrompt += '  - Date fields: YYYY-MM-DD\n';
    extractionPrompt += '  - Currency fields: Include symbol and decimals (e.g., $1,234.56)\n';
    extractionPrompt += '  - Number fields: Plain numbers without formatting\n';
    extractionPrompt += '- If a field is not present in the document, use null or empty string\n';
    extractionPrompt += '- For detail rows, extract all line items or repeating sections\n';

    // Detect document type from base64 header
    let documentType = 'application/pdf';
    if (documentBase64.startsWith('/9j/')) {
      documentType = 'image/jpeg';
    } else if (documentBase64.startsWith('iVBORw0KGgo')) {
      documentType = 'image/png';
    }

    // Build content array
    const contentArray: any[] = [];

    if (documentType === 'application/pdf') {
      contentArray.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf' as const,
          data: documentBase64,
        },
      });
    } else if (documentType === 'text/plain') {
      try {
        const textContent = Buffer.from(documentBase64, 'base64').toString('utf-8');
        contentArray.push({
          type: 'text',
          text: `Document content:\n\n${textContent}\n\n`,
        });
      } catch (e) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to decode text document',
            retryable: false,
          } satisfies ProductionExtractionResponse,
          { status: 400 }
        );
      }
    } else {
      // Image types
      contentArray.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: documentType as 'image/jpeg' | 'image/png',
          data: documentBase64,
        },
      });
    }

    contentArray.push({
      type: 'text',
      text: extractionPrompt,
    });

    // Call Claude API with 30s timeout
    const message = await anthropic.messages.create(
      {
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: contentArray,
          },
        ],
        tools: [
          {
            name: 'extract_data',
            description: 'Extract structured data from document',
            input_schema: extractionSchema as any,
          },
        ],
        tool_choice: { type: 'tool', name: 'extract_data' },
      },
      {
        timeout: 30000, // 30 second timeout
      }
    );

    // Parse tool use response
    const toolUseBlock = message.content.find((c) => c.type === 'tool_use');

    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      console.error('Claude response missing tool_use block:', message.content);
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to extract data from document. Please check document content or try again.',
          retryable: true,
        } satisfies ProductionExtractionResponse,
        { status: 500 }
      );
    }

    const extractedData = toolUseBlock.input as any;
    const headerData = extractedData.header_fields || {};
    const detailRows = extractedData.detail_rows || [];

    // Denormalize data and calculate confidence scores
    const extractedRows = denormalizeData(
      headerData,
      detailRows,
      template.fields,
      filename
    );

    // Story 2.9: Auto-save extraction results to database
    let extractionId: string | undefined;
    try {
      const savedExtraction = await createExtraction({
        template_id: templateId,
        filename: filename,
        extracted_data: extractedRows,
        row_count: extractedRows.length,
      });
      extractionId = savedExtraction.id;
      console.log(`✅ Extraction saved to database: ${extractionId}`);
    } catch (saveError: any) {
      // Log error but don't block user workflow
      console.error('⚠️  Failed to save extraction to database:', saveError.message);
      console.error('User will still receive extraction results, but history will not be saved');
    }

    // Return success response with optional extractionId
    return NextResponse.json({
      success: true,
      data: extractedRows,
      rowCount: extractedRows.length,
      extractionId,
    } satisfies ProductionExtractionSuccessResponse);
  } catch (error) {
    console.error('Error in production extraction API:', error);

    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API Error:', {
        status: error.status,
        message: error.message,
        name: error.name,
      });

      if (error.status === 401) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid API key. Please contact support.',
            retryable: false,
          } satisfies ProductionExtractionResponse,
          { status: 500 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service temporarily unavailable. Please try again in a moment.',
            retryable: true,
          } satisfies ProductionExtractionResponse,
          { status: 429 }
        );
      }

      // Timeout error
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Extraction timed out. Try a smaller document or retry.',
            retryable: true,
          } satisfies ProductionExtractionResponse,
          { status: 500 }
        );
      }

      // Document parsing error
      if (error.message.includes('parse') || error.message.includes('format')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to parse document. Please check file format.',
            retryable: false,
          } satisfies ProductionExtractionResponse,
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `API Error: ${error.message}`,
          retryable: true,
        } satisfies ProductionExtractionResponse,
        { status: 500 }
      );
    }

    // Handle general errors
    if (error instanceof Error) {
      console.error('General Error:', {
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to extract data. Please try again or contact support.',
        retryable: true,
      } satisfies ProductionExtractionResponse,
      { status: 500 }
    );
  }
}
