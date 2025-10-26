import { NextRequest, NextResponse } from 'next/server';
import PDFParser, { PDFParsingError, ErrorCode } from '@/lib/services/PDFParser';

// Configure route to accept large file uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout for PDF parsing
export const dynamic = 'force-dynamic';

// Note: Next.js 14 App Router handles FormData automatically without size limits
// The maxDuration setting prevents timeout for large files

/**
 * POST /api/parse-pdf
 * Parse a PDF file and extract text content with metadata
 *
 * Request: FormData with 'file' field containing PDF
 * Response: ParseResult JSON or error
 */
export async function POST(request: NextRequest) {
  try {
    // Extract file from FormData
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided or invalid file format' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using PDFParser service
    const parser = PDFParser.getInstance();
    const result = await parser.parsePDF(buffer);

    // Return successful result
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('[API /parse-pdf] Error:', error);

    // Handle PDFParsingError with specific HTTP status codes
    if (error instanceof PDFParsingError) {
      const statusCode = getStatusCodeForError(error.code);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: statusCode }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

/**
 * Map ErrorCode to appropriate HTTP status code
 */
function getStatusCodeForError(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.INVALID_PDF_FORMAT:
    case ErrorCode.CORRUPTED_PDF:
      return 400; // Bad Request

    case ErrorCode.PASSWORD_PROTECTED:
      return 403; // Forbidden

    case ErrorCode.FILE_TOO_LARGE:
      return 413; // Payload Too Large

    case ErrorCode.UNSUPPORTED_PDF_VERSION:
      return 415; // Unsupported Media Type

    case ErrorCode.PARSING_TIMEOUT:
      return 408; // Request Timeout

    case ErrorCode.PARSING_FAILED:
    default:
      return 500; // Internal Server Error
  }
}
