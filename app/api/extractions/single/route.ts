import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { TemplateField } from '@/types/template';

/**
 * Story 3.7: Single File Extraction API Endpoint
 *
 * POST /api/extractions/single
 * Processes a single PDF file with template fields and returns structured extraction results
 *
 * Request (multipart/form-data):
 * - file: File (PDF document to extract from)
 * - fields: string (JSON array of TemplateField objects)
 * - extraction_prompt: string (optional custom instructions)
 * - template_id: string (optional UUID of saved template)
 *
 * Response 200:
 * {
 *   "success": true,
 *   "extraction_id": "uuid",
 *   "filename": "document.pdf",
 *   "template_id": "uuid | null",
 *   "template_name": "string | null",
 *   "timestamp": "ISO 8601",
 *   "results": [
 *     {
 *       "field_name": "Invoice Number",
 *       "field_type": "text",
 *       "extracted_value": "INV-12345"
 *     }
 *   ]
 * }
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface FieldResult {
  field_name: string;
  field_type: string;
  extracted_value: any;
}

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract fields from form data
    const file = formData.get('file') as File | null;
    const fieldsJson = formData.get('fields') as string | null;
    const extractionPrompt = formData.get('extraction_prompt') as string | null;
    const templateId = formData.get('template_id') as string | null;
    const templateName = formData.get('template_name') as string | null;

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
    const extractionSchema = {
      type: 'object',
      properties: {
        extracted_fields: {
          type: 'object',
          properties: Object.fromEntries(
            fields.map((f) => [
              f.name,
              {
                type: 'string',
                description: `Extract ${f.name} from document${f.instructions ? `: ${f.instructions}` : ''}`,
              },
            ])
          ),
        },
      },
      required: ['extracted_fields'],
    };

    // Build extraction prompt
    let prompt = 'IMPORTANT: Extract the following fields from this document.\n\n';

    // Add custom extraction instructions if provided
    if (extractionPrompt && extractionPrompt.trim()) {
      prompt += 'EXTRACTION INSTRUCTIONS:\n';
      prompt += `${extractionPrompt.trim()}\n\n`;
    }

    // Add field list
    prompt += 'Fields to extract:\n';
    fields.forEach((f) => {
      const fieldDesc = f.instructions ? ` - ${f.instructions}` : '';
      prompt += `- ${f.name}${fieldDesc}\n`;
    });
    prompt += '\n';

    // Add formatting instructions
    prompt += 'EXTRACTION REQUIREMENTS:\n';
    prompt += '- All fields must be returned as strings\n';
    prompt += '- If a field is not present in the document, use an empty string\n';
    prompt += '- Extract exact values as they appear in the document\n';
    prompt += '- Follow any custom instructions provided above\n';

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
        },
        { status: 500 }
      );
    }

    const extractedData = toolUseBlock.input as any;
    const extractedFields = extractedData.extracted_fields || {};

    // Format results as FieldResult array
    const results: FieldResult[] = fields.map((field) => ({
      field_name: field.name,
      field_type: 'text', // Default type
      extracted_value: extractedFields[field.name] || '',
    }));

    // Generate extraction ID (client-side UUID)
    const extractionId = crypto.randomUUID();

    // Return success response
    return NextResponse.json({
      success: true,
      extraction_id: extractionId,
      filename: file.name,
      template_id: templateId || null,
      template_name: templateName || null,
      timestamp: new Date().toISOString(),
      results,
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
