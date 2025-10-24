/**
 * Extractions API Route
 * Story 2.9: Extraction Session Management
 *
 * Endpoints:
 * - GET    /api/extractions - List recent extractions (10 most recent)
 * - DELETE /api/extractions - Clear all extractions (Clear History)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentExtractions, deleteAllExtractions } from '@/lib/db/extractions';

/**
 * GET /api/extractions
 * Retrieve 10 most recent extractions with template names
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Fetching recent extractions...');

    const extractions = await getRecentExtractions();

    console.log(`✅ Retrieved ${extractions.length} extractions`);

    return NextResponse.json({ extractions });
  } catch (error: any) {
    console.error('❌ Error fetching extractions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch extractions', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/extractions
 * Clear all extractions from database (Clear History functionality)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️  Clearing all extractions...');

    const deletedCount = await deleteAllExtractions();

    console.log(`✅ Deleted ${deletedCount} extractions`);

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} extraction${deletedCount === 1 ? '' : 's'}`,
    });
  } catch (error: any) {
    console.error('❌ Error clearing extractions:', error);
    return NextResponse.json(
      { error: 'Failed to clear extractions', details: error.message },
      { status: 500 }
    );
  }
}
