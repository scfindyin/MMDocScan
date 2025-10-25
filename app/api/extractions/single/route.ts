import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { TemplateField } from '@/types/template';
import { ExtractedRow, SourceMetadata } from '@/types/extraction';

/**
 * Story 3.7: Single File Extraction API Endpoint
 *
 * POST /api/extractions/single
 * Processes a single PDF file with template fields and returns structured extraction results
 * Returns ExtractedRow[] format matching Story 2.3 for consistency
 *
 * Request (multipart/form-data):
 * - file: File (PDF document to extract from)
 * - fields: string (JSON array of TemplateField objects)
 * - extraction_prompt: string (optional custom instructions)
 *
 * Response 200:
 * {
 *   "success": true,
 *   "data": ExtractedRow[],
 *   "rowCount": number,
 *   "filename": string
 * }
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  for (const templateField of templateFields) {
    const value = fields[templateField.name];

    // Check if field is populated (non-empty string or valid value)
    if (value !== null && value !== undefined && value !== '') {
      populatedFields++;
    }
  }

  // Completeness factor: percentage of fields populated
  const completenessFactor = populatedFields / totalFields;

  return completenessFactor;
}

/**
 * Denormalize data: repeat header fields on each detail row
 * If extraction returns structured data with header and details, flatten it
 */
function denormalizeData(
  extractedData: any,
  templateFields: TemplateField[],
  filename: string
): ExtractedRow[] {
  const results: ExtractedRow[] = [];

  // Check if extracted data has header/detail structure
  if (
    extractedData.header &&
    extractedData.details &&
    Array.isArray(extractedData.details)
  ) {
    // Multi-row extraction (e.g., invoice with line items)
    const headerFields = extractedData.header;

    if (extractedData.details.length === 0) {
      // No detail rows, create single row with header only
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
      // Create one row per detail row, repeating header fields
      for (const detailRow of extractedData.details) {
        const allFields = { ...headerFields, ...detailRow };
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
      }
    }
  } else {
    // Simple flat extraction (single row with all fields)
    const allFields = extractedData;
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
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract fields from form data
    const file = formData.get('file') as File | null;
    const fieldsJson = formData.get('fields') as string | null;
    const extractionPrompt = formData.get('extraction_prompt') as string | null;

    // Validation: file required
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: file required',
        },
        { status: 400 }
      );
    }

    // Validation: file type must be PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type: must be PDF',
        },
        { status: 400 }
      );
    }

    // Validation: file size limit
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds 10MB limit. File size: ${sizeMB}MB`,
        },
        { status: 400 }
      );
    }

    // Validation: fields required
    if (!fieldsJson) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: fields required',
        },
        { status: 400 }
      );
    }

    // Parse fields JSON
    let fields: TemplateField[];
    try {
      fields = JSON.parse(fieldsJson);
      if (!Array.isArray(fields) || fields.length === 0) {
        throw new Error('Fields must be a non-empty array');
      }
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid fields format: must be JSON array of TemplateField objects',
        },
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
        },
        { status: 500 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build extraction schema for Claude API
    // Create a flexible schema that allows both flat and structured (header/detail) responses
    const extractionSchema = {
      type: 'object',
      properties: {
        header: {
          type: 'object',
          description: 'Header fields (document-level information like invoice number, date, vendor)',
          properties: Object.fromEntries(
            fields.map((f) => [
              f.name,
              {
                type: 'string',
                description: f.instructions || `Extract ${f.name} from document`,
              },
            ])
          ),
        },
        details: {
          type: 'array',
          description:
            'Detail rows (line items, transactions, etc.). If document has multiple rows/items, extract each as a separate detail object. If single record, can be empty array.',
          items: {
            type: 'object',
            properties: Object.fromEntries(
              fields.map((f) => [
                f.name,
                {
                  type: 'string',
                  description: f.instructions || `Extract ${f.name}`,
                },
              ])
            ),
          },
        },
      },
    };

    // Build extraction prompt
    let prompt = 'Extract data from this document and return it in structured format.\n\n';

    // Add custom extraction instructions if provided
    if (extractionPrompt && extractionPrompt.trim()) {
      prompt += 'CUSTOM INSTRUCTIONS:\n';
      prompt += `${extractionPrompt.trim()}\n\n`;
    }

    // Add field list
    prompt += 'FIELDS TO EXTRACT:\n';
    fields.forEach((f) => {
      const fieldDesc = f.instructions ? ` - ${f.instructions}` : '';
      prompt += `- ${f.name}${fieldDesc}\n`;
    });
    prompt += '\n';

    // Add structure instructions
    prompt += 'IMPORTANT INSTRUCTIONS:\n';
    prompt +=
      '- If this document has REPEATING DATA (like invoice line items, multiple transactions, etc.):\n';
    prompt +=
      '  * Put document-level fields (invoice number, date, vendor, etc.) in "header"\n';
    prompt += '  * Put each line item/row in "details" array with its own field values\n';
    prompt += '  * Example: Invoice with 3 line items = header + 3 detail objects\n';
    prompt += '- If this document has SINGLE RECORD (no repeating data):\n';
    prompt += '  * Put all fields in "header"\n';
    prompt += '  * Leave "details" as empty array []\n';
    prompt += '- All field values should be strings\n';
    prompt += '- If a field is not present in the document, use empty string ""\n';
    prompt += '- Extract exact values as they appear in the document\n';

    // Build content array for Claude API
    const contentArray: any[] = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf' as const,
          data: base64,
        },
      },
      {
        type: 'text',
        text: prompt,
      },
    ];

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
            description:
              'Extract structured data from document with header and details format',
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
          error:
            'Unable to extract data from document. Please check document content or try again.',
        },
        { status: 500 }
      );
    }

    const extractedData = toolUseBlock.input as any;

    // Denormalize data into ExtractedRow[] format
    const extractedRows = denormalizeData(extractedData, fields, file.name);

    // Return success response matching Story 2.3 format
    return NextResponse.json({
      success: true,
      data: extractedRows,
      rowCount: extractedRows.length,
      filename: file.name,
    });
  } catch (error) {
    console.error('Error in single extraction API:', error);

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
          },
          { status: 500 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          {
            success: false,
            error: 'Service temporarily unavailable. Please try again in a moment.',
          },
          { status: 429 }
        );
      }

      // Timeout error
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Extraction timed out. Try a smaller document or retry.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `API Error: ${error.message}`,
        },
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
      },
      { status: 500 }
    );
  }
}
