/**
 * Results Retrieval API Endpoint (Story 3.11)
 * GET /api/extractions/batch/:id/results
 *
 * Returns all extracted results for a completed session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSessionById, getSessionResults } from '@/lib/db/batch-extractions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const sessionId = params.id;

    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      );
    }

    // Get session (RLS ensures user owns it)
    const session = await getSessionById(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if session is completed
    if (session.status !== 'completed' && session.status !== 'failed') {
      return NextResponse.json(
        {
          error: 'Session not yet completed',
          status: session.status,
          progress: session.progress,
        },
        { status: 400 }
      );
    }

    // Get all results
    const results = await getSessionResults(sessionId);

    // Group results by source file
    const resultsByFile = results.reduce((acc, result) => {
      const fileName = result.source_file;

      if (!acc[fileName]) {
        acc[fileName] = {
          source_file: result.source_file,
          file_id: result.file_id,
          extracted_data: result.extracted_data,
          error: result.error || null,
          metadata: result.metadata || {},
          created_at: result.created_at,
        };
      }

      return acc;
    }, {} as Record<string, unknown>);

    return NextResponse.json({
      session_id: session.id,
      status: session.status,
      template_id: session.template_id,
      template_snapshot: session.template_snapshot,
      created_at: session.created_at,
      completed_at: session.completed_at,
      results: Object.values(resultsByFile),
      total_files: Object.keys(resultsByFile).length,
    });

  } catch (error) {
    console.error('[Results API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
