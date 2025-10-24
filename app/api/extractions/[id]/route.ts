/**
 * Single Extraction API Route
 * Story 2.9: Extraction Session Management
 *
 * Endpoints:
 * - GET /api/extractions/:id - Get single extraction with full data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getExtractionById } from '@/lib/db/extractions';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid extraction ID format');

/**
 * GET /api/extractions/:id
 * Retrieve a single extraction by ID with full extracted_data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📄 Fetching extraction: ${params.id}`);

    // Validate UUID format
    const validationResult = uuidSchema.safeParse(params.id);

    if (!validationResult.success) {
      console.error('❌ Invalid UUID format:', validationResult.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid extraction ID format',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const extraction = await getExtractionById(params.id);

    if (!extraction) {
      console.log(`❌ Extraction not found: ${params.id}`);
      return NextResponse.json(
        { error: 'Extraction not found', id: params.id },
        { status: 404 }
      );
    }

    console.log(`✅ Retrieved extraction: ${extraction.filename} (${extraction.row_count} rows)`);

    return NextResponse.json({ extraction });
  } catch (error: any) {
    console.error('❌ Error fetching extraction:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extraction', details: error.message },
      { status: 500 }
    );
  }
}
