/**
 * Session Status API Endpoint (Story 3.11)
 * GET /api/extractions/batch/:id/status
 *
 * Returns current session status and progress information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSessionStatus } from '@/lib/db/batch-extractions';
import { rateLimitManager } from '@/lib/services/RateLimitManager';

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

    // Get session status (RLS ensures user owns it)
    const statusData = await getSessionStatus(sessionId);

    if (!statusData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const { session, resultsCount, hasErrors } = statusData;

    // Get rate limit stats
    const rateLimitStats = rateLimitManager.getRateLimitStats();

    // Calculate estimated time remaining (rough estimate)
    let estimatedTimeRemaining: number | null = null;
    if (session.status === 'processing') {
      const filesMetadata = session.files as Array<{ name: string }>;
      const totalFiles = filesMetadata.length;
      const remainingFiles = totalFiles - resultsCount;

      // Estimate 30 seconds per file (very rough)
      estimatedTimeRemaining = remainingFiles * 30;
    }

    return NextResponse.json({
      session_id: session.id,
      status: session.status,
      progress: session.progress,
      created_at: session.created_at,
      completed_at: session.completed_at || null,
      files: {
        total: (session.files as Array<unknown>).length,
        processed: resultsCount,
        hasErrors,
      },
      estimated_time_remaining: estimatedTimeRemaining,
      rate_limit: {
        current_usage: rateLimitStats.currentUsage,
        effective_limit: rateLimitStats.effectiveLimit,
        percentage_used: Math.round(rateLimitStats.percentageUsed),
        time_until_reset: Math.round(rateLimitStats.timeUntilReset),
      },
    });

  } catch (error) {
    console.error('[Status API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
