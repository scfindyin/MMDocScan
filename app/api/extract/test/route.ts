import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  TestExtractionRequestSchema,
  TestExtractionResponse,
  ExtractedRow,
} from '@/types/extraction';

/**
 * Template field type for test extraction (subset of TemplateField)
 */
interface TestTemplateField {
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'currency';
  is_header: boolean;
}

/**
 * Calculate confidence score for an extracted row
 * Based on field completeness and data type validation
 * Algorithm matches Story 2.3 production extraction
 */
function calculateConfidence(
  fields: Record<string, any>,
  templateFields: TestTemplateField[]
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
 */
function validateFieldType(value: any, fieldType: string): boolean {
  switch (fieldType) {
    case 'number':
    case 'currency':
      return !isNaN(parseFloat(value));
    case 'date':
      return !isNaN(Date.parse(value));
    case 'text':
      return typeof value === 'string';
    default:
      return true;
  }
}

/**
 * Denormalize data: repeat header fields on each detail row
 * Algorithm matches Story 2.3 production extraction
 */
function denormalizeData(
  headerFields: Record<string, any>,
  detailRows: Record<string, any>[],
  templateFields: TestTemplateField[]
): ExtractedRow[] {
  const results: ExtractedRow[] = [];
  const filename = 'test-document';

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
    detailRows.forEach((detailRow) => {
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
    const validationResult = TestExtractionRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          retryable: false,
        } satisfies TestExtractionResponse,
        { status: 400 }
      );
    }

    const { documentBase64, templateFields, customPrompt } = validationResult.data;

    // Validate template fields
    if (templateFields.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please define at least one field',
          retryable: false,
        } satisfies TestExtractionResponse,
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
        } satisfies TestExtractionResponse,
        { status: 500 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Separate header and detail fields
    const headerFields = templateFields.filter((f) => f.is_header);
    const detailFields = templateFields.filter((f) => !f.is_header);

    // Build extraction schema for tool calling
    const extractionSchema = {
      type: 'object',
      properties: {
        header_fields: {
          type: 'object',
          properties: Object.fromEntries(
            headerFields.map((f) => [
              f.field_name,
              {
                type: f.field_type === 'number' || f.field_type === 'currency' ? 'number' : 'string',
                description: `Extract ${f.field_name} from document`,
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
                  type: f.field_type === 'number' || f.field_type === 'currency' ? 'number' : 'string',
                  description: `Extract ${f.field_name} from line item`,
                },
              ])
            ),
          },
        },
      },
      required: ['header_fields', 'detail_rows'],
    };

    // Build extraction prompt
    let extractionPrompt = 'Extract structured data from this document based on the following template:\n\n';

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

    // Add custom prompt if provided
    if (customPrompt && customPrompt.trim()) {
      extractionPrompt += `Additional extraction guidance:\n${customPrompt.trim()}\n\n`;
    }

    extractionPrompt +=
      'Extract all data accurately. If a field is not present in the document, use null or empty string. For detail rows, extract all line items or repeating sections.';

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
          } satisfies TestExtractionResponse,
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
        } satisfies TestExtractionResponse,
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
      templateFields
    );

    // Return success response
    return NextResponse.json({
      success: true,
      data: extractedRows,
      rowCount: extractedRows.length,
    } satisfies TestExtractionResponse);
  } catch (error) {
    console.error('Error in test extraction API:', error);

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
            error: 'API configuration error. Please contact support.',
            retryable: false,
          } satisfies TestExtractionResponse,
          { status: 500 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please try again in a moment.',
            retryable: true,
          } satisfies TestExtractionResponse,
          { status: 429 }
        );
      }

      // Timeout error
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Extraction timed out. Try a simpler document or retry.',
            retryable: true,
          } satisfies TestExtractionResponse,
          { status: 500 }
        );
      }

      // Document parsing error
      if (error.message.includes('parse') || error.message.includes('format')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unable to parse document. Try a different format.',
            retryable: false,
          } satisfies TestExtractionResponse,
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Extraction failed: ${error.message}`,
          retryable: true,
        } satisfies TestExtractionResponse,
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
      } satisfies TestExtractionResponse,
      { status: 500 }
    );
  }
}
