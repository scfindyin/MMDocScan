/**
 * SessionStore Service
 * Story 3.11: In-Memory Session Management with 5-Minute TTL
 *
 * Manages batch extraction sessions in memory with automatic cleanup.
 * Sessions expire 5 minutes after creation to prevent memory leaks.
 */

import { BatchExtractionSession, SessionStatus, TemplateSnapshot, CustomColumn, FileProcessingStatus } from '@/types/batchExtraction';
import { ExtractedRow } from '@/types/extraction';
import { randomUUID } from 'crypto';

/**
 * SessionStore - Singleton Service
 *
 * In-memory storage for batch extraction sessions with automatic TTL cleanup.
 * Designed for single-server deployments (not suitable for multi-server without Redis).
 *
 * @example
 * ```typescript
 * const store = SessionStore.getInstance();
 * const sessionId = store.createSession(template, files, customColumns);
 * const session = store.getSession(sessionId);
 * store.updateProgress(sessionId, 50, 'processing');
 * ```
 */
class SessionStore {
  private static instance: SessionStore;

  // In-memory storage
  private sessions: Map<string, BatchExtractionSession> = new Map();

  // TTL configuration
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    console.log('[SessionStore] Initialized with TTL:', this.TTL_MS, 'ms');
    this.startCleanupInterval();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  /**
   * Start automatic cleanup interval (runs every minute)
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000); // Run every 60 seconds

    console.log('[SessionStore] Cleanup interval started');
  }

  /**
   * Stop cleanup interval (for testing)
   */
  public stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[SessionStore] Cleanup interval stopped');
    }
  }

  /**
   * Create a new batch extraction session
   *
   * @param template - Template snapshot
   * @param files - File processing status array
   * @param customColumns - Custom columns to append
   * @returns sessionId
   */
  public createSession(
    template: TemplateSnapshot,
    files: FileProcessingStatus[],
    customColumns: CustomColumn[] = []
  ): string {
    const sessionId = randomUUID();

    const session: BatchExtractionSession = {
      sessionId,
      templateSnapshot: template,
      files,
      customColumns,
      status: 'pending',
      progress: 0,
      results: [],
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    console.log('[SessionStore] Session created:', {
      sessionId,
      fileCount: files.length,
      customColumnCount: customColumns.length,
    });

    return sessionId;
  }

  /**
   * Get session by ID
   *
   * @param sessionId - Session ID
   * @returns Session or null if not found
   */
  public getSession(sessionId: string): BatchExtractionSession | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.warn('[SessionStore] Session not found:', sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session
   *
   * @param sessionId - Session ID
   * @param updates - Partial session updates
   */
  public updateSession(
    sessionId: string,
    updates: Partial<BatchExtractionSession>
  ): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.error('[SessionStore] Cannot update - session not found:', sessionId);
      return;
    }

    Object.assign(session, updates);

    console.log('[SessionStore] Session updated:', {
      sessionId,
      updates: Object.keys(updates),
    });
  }

  /**
   * Update session progress
   *
   * @param sessionId - Session ID
   * @param progress - Progress percentage (0-100)
   * @param status - Session status
   */
  public updateProgress(
    sessionId: string,
    progress: number,
    status: SessionStatus
  ): void {
    this.updateSession(sessionId, { progress, status });
  }

  /**
   * Add extraction results to session
   *
   * @param sessionId - Session ID
   * @param results - Extracted rows to append
   */
  public addResults(sessionId: string, results: ExtractedRow[]): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      console.error('[SessionStore] Cannot add results - session not found:', sessionId);
      return;
    }

    session.results.push(...results);

    console.log('[SessionStore] Results added:', {
      sessionId,
      newRows: results.length,
      totalRows: session.results.length,
    });
  }

  /**
   * Mark session as failed
   *
   * @param sessionId - Session ID
   * @param error - Error message
   */
  public setError(sessionId: string, error: string): void {
    this.updateSession(sessionId, {
      status: 'failed',
      errorMessage: error,
      completedAt: new Date(),
    });

    console.error('[SessionStore] Session marked as failed:', {
      sessionId,
      error,
    });
  }

  /**
   * Mark session as completed
   *
   * @param sessionId - Session ID
   */
  public markCompleted(sessionId: string): void {
    this.updateSession(sessionId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date(),
    });

    console.log('[SessionStore] Session marked as completed:', sessionId);
  }

  /**
   * Delete session
   *
   * @param sessionId - Session ID
   */
  public deleteSession(sessionId: string): void {
    const deleted = this.sessions.delete(sessionId);

    if (deleted) {
      console.log('[SessionStore] Session deleted:', sessionId);
    } else {
      console.warn('[SessionStore] Session not found for deletion:', sessionId);
    }
  }

  /**
   * Cleanup expired sessions (older than TTL)
   */
  public cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      const ageMs = now.getTime() - session.createdAt.getTime();

      if (ageMs >= this.TTL_MS) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        console.log('[SessionStore] Expired session cleaned up:', {
          sessionId,
          ageMinutes: Math.round(ageMs / 60000),
        });
      }
    }

    if (cleanedCount > 0) {
      console.log(`[SessionStore] Cleanup complete: ${cleanedCount} sessions removed`);
    }
  }

  /**
   * Get all active sessions (for debugging)
   */
  public getAllSessions(): BatchExtractionSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count (for monitoring)
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  public clearAll(): void {
    this.sessions.clear();
    console.log('[SessionStore] All sessions cleared');
  }
}

// Export singleton instance
export const sessionStore = SessionStore.getInstance();

// Export class for testing
export default SessionStore;
