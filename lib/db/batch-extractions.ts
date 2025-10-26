/**
 * Database Access Layer for Batch Extractions (Story 3.11)
 * Provides CRUD operations for extraction_sessions and extraction_results tables
 */

import { createClient } from '@/lib/supabase-server';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ExtractionSession {
  id: string;
  user_id: string;
  template_id: string;
  template_snapshot: TemplateSnapshot;
  files: FileMetadata[];
  custom_columns?: Record<string, unknown>;
  status: SessionStatus;
  progress: number;
  created_at: string;
  completed_at?: string;
}

export type SessionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'timeout';

export interface TemplateSnapshot {
  id: string;
  name: string;
  fields: Array<{
    id: string;
    name: string;
    instructions?: string;
    order: number;
  }>;
  extraction_prompt?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
}

export interface ExtractionResult {
  id: string;
  session_id: string;
  file_id: string;
  source_file: string;
  page_number?: number;
  detection_confidence?: number;
  extracted_data: unknown;
  raw_api_response?: unknown;
  error?: string;
  metadata?: ResultMetadata;
  created_at: string;
}

export interface ResultMetadata {
  totalChunks?: number;
  successfulChunks?: number;
  failedChunks?: number;
  totalTokensUsed?: number;
  cacheHitRate?: number;
  warnings?: string[];
  tier?: string;
  detectedDocuments?: Array<{
    startPage: number;
    endPage: number;
    confidence: number;
  }>;
}

export interface CreateSessionInput {
  user_id: string;
  template_id: string;
  template_snapshot: TemplateSnapshot;
  files: FileMetadata[];
  custom_columns?: Record<string, unknown>;
}

export interface CreateResultInput {
  session_id: string;
  file_id: string;
  source_file: string;
  page_number?: number;
  detection_confidence?: number;
  extracted_data: unknown;
  raw_api_response?: unknown;
  error?: string;
  metadata?: ResultMetadata;
}

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Create a new extraction session
 * @param input Session creation parameters
 * @returns Created session or null on error
 */
export async function createSession(input: CreateSessionInput): Promise<ExtractionSession | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('extraction_sessions')
      .insert({
        user_id: input.user_id,
        template_id: input.template_id,
        template_snapshot: input.template_snapshot,
        files: input.files,
        custom_columns: input.custom_columns || null,
        status: 'queued',
        progress: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[batch-extractions] Error creating session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[batch-extractions] Exception in createSession:', error);
    return null;
  }
}

/**
 * Get a session by ID (with RLS - only returns if user owns it)
 * @param sessionId Session UUID
 * @returns Session or null if not found/unauthorized
 */
export async function getSessionById(sessionId: string): Promise<ExtractionSession | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('extraction_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('[batch-extractions] Error getting session:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[batch-extractions] Exception in getSessionById:', error);
    return null;
  }
}

/**
 * Get all sessions for the current user
 * @param limit Max number of sessions to return
 * @returns Array of sessions (newest first)
 */
export async function getUserSessions(limit = 50): Promise<ExtractionSession[]> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('extraction_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[batch-extractions] Error getting user sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[batch-extractions] Exception in getUserSessions:', error);
    return [];
  }
}

/**
 * Update session status
 * @param sessionId Session UUID
 * @param status New status value
 * @returns Success boolean
 */
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<boolean> {
  try {
    const supabase = createClient();

    const updateData: {
      status: SessionStatus;
      completed_at?: string;
    } = { status };

    // Set completed_at timestamp for terminal states
    if (status === 'completed' || status === 'failed' || status === 'timeout') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('extraction_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      console.error('[batch-extractions] Error updating session status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[batch-extractions] Exception in updateSessionStatus:', error);
    return false;
  }
}

/**
 * Update session progress
 * @param sessionId Session UUID
 * @param progress Progress percentage (0-100)
 * @returns Success boolean
 */
export async function updateSessionProgress(
  sessionId: string,
  progress: number
): Promise<boolean> {
  try {
    const supabase = createClient();

    // Clamp progress between 0 and 100
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

    const { error } = await supabase
      .from('extraction_sessions')
      .update({ progress: clampedProgress })
      .eq('id', sessionId);

    if (error) {
      console.error('[batch-extractions] Error updating session progress:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[batch-extractions] Exception in updateSessionProgress:', error);
    return false;
  }
}

/**
 * Delete a session (cascades to results)
 * @param sessionId Session UUID
 * @returns Success boolean
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('extraction_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('[batch-extractions] Error deleting session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[batch-extractions] Exception in deleteSession:', error);
    return false;
  }
}

// ============================================================================
// Result Operations
// ============================================================================

/**
 * Store an extraction result
 * @param input Result creation parameters
 * @returns Created result or null on error
 */
export async function storeExtractionResult(
  input: CreateResultInput
): Promise<ExtractionResult | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('extraction_results')
      .insert({
        session_id: input.session_id,
        file_id: input.file_id,
        source_file: input.source_file,
        page_number: input.page_number || null,
        detection_confidence: input.detection_confidence || null,
        extracted_data: input.extracted_data,
        raw_api_response: input.raw_api_response || null,
        error: input.error || null,
        metadata: input.metadata || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[batch-extractions] Error storing result:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[batch-extractions] Exception in storeExtractionResult:', error);
    return null;
  }
}

/**
 * Get all results for a session
 * @param sessionId Session UUID
 * @returns Array of results (ordered by created_at)
 */
export async function getSessionResults(sessionId: string): Promise<ExtractionResult[]> {
  try {
    const supabase = createClient();

    const { data, error} = await supabase
      .from('extraction_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[batch-extractions] Error getting session results:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[batch-extractions] Exception in getSessionResults:', error);
    return [];
  }
}

/**
 * Get session status with results count
 * @param sessionId Session UUID
 * @returns Session with results metadata or null
 */
export async function getSessionStatus(sessionId: string): Promise<{
  session: ExtractionSession;
  resultsCount: number;
  hasErrors: boolean;
} | null> {
  try {
    const supabase = createClient();

    // Get session
    const session = await getSessionById(sessionId);
    if (!session) {
      return null;
    }

    // Get results count and error status
    const { count } = await supabase
      .from('extraction_results')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    const { count: errorCount } = await supabase
      .from('extraction_results')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .not('error', 'is', null);

    return {
      session,
      resultsCount: count || 0,
      hasErrors: (errorCount || 0) > 0,
    };
  } catch (error) {
    console.error('[batch-extractions] Exception in getSessionStatus:', error);
    return null;
  }
}

/**
 * Delete all results for a session (useful for retry logic)
 * @param sessionId Session UUID
 * @returns Success boolean
 */
export async function deleteSessionResults(sessionId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('extraction_results')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('[batch-extractions] Error deleting session results:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[batch-extractions] Exception in deleteSessionResults:', error);
    return false;
  }
}
