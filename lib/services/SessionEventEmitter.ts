/**
 * SessionEventEmitter Service
 * Story 3.11: Type-Safe SSE Event Emission and Subscription
 *
 * Manages Server-Sent Events for batch extraction progress streaming.
 * Provides type-safe event emission and subscription with event buffering.
 */

import { EventEmitter } from 'events';
import {
  SSEEventType,
  SSEEventData,
  SessionStartedEvent,
  FileParsingEvent,
  FileParsedEvent,
  FileParsingFailedEvent,
  DocumentDetectedEvent,
  ExtractionStartedEvent,
  ExtractionProgressEvent,
  ExtractionCompletedEvent,
  ExtractionFailedEvent,
  ExtractionTimeoutEvent,
  RateLimitWaitEvent,
  NetworkErrorEvent,
  InvalidResponseEvent,
  SessionCompletedEvent,
  SessionFailedEvent,
} from '@/types/sseEvents';

type EventCallback = (event: SSEEventData) => void;

/**
 * SessionEventEmitter - Singleton Service
 *
 * Type-safe event emitter for SSE progress streaming.
 * Supports event buffering for late subscribers.
 *
 * @example
 * ```typescript
 * const emitter = SessionEventEmitter.getInstance();
 *
 * // Subscribe to events
 * emitter.subscribe('session123', SSEEventType.EXTRACTION_PROGRESS, (event) => {
 *   console.log('Progress:', event.data.progress);
 * });
 *
 * // Emit events
 * emitter.emitExtractionProgress('session123', 50, 5, 10);
 * ```
 */
class SessionEventEmitter {
  private static instance: SessionEventEmitter;

  // Node.js EventEmitter
  private emitter: EventEmitter;

  // Event buffer (last 100 events per session)
  private eventBuffer: Map<string, SSEEventData[]> = new Map();
  private readonly MAX_BUFFER_SIZE = 100;

  private constructor() {
    this.emitter = new EventEmitter();
    // Increase max listeners for SSE connections
    this.emitter.setMaxListeners(100);
    console.log('[SessionEventEmitter] Initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SessionEventEmitter {
    if (!SessionEventEmitter.instance) {
      SessionEventEmitter.instance = new SessionEventEmitter();
    }
    return SessionEventEmitter.instance;
  }

  /**
   * Get event key for session
   */
  private getEventKey(sessionId: string, eventType?: SSEEventType): string {
    return eventType ? `${sessionId}:${eventType}` : `${sessionId}:*`;
  }

  /**
   * Buffer event for late subscribers
   */
  private bufferEvent(sessionId: string, event: SSEEventData): void {
    if (!this.eventBuffer.has(sessionId)) {
      this.eventBuffer.set(sessionId, []);
    }

    const buffer = this.eventBuffer.get(sessionId)!;
    buffer.push(event);

    // Keep only last MAX_BUFFER_SIZE events
    if (buffer.length > this.MAX_BUFFER_SIZE) {
      buffer.shift();
    }
  }

  /**
   * Get buffered events for session
   */
  public getBufferedEvents(sessionId: string): SSEEventData[] {
    return this.eventBuffer.get(sessionId) || [];
  }

  /**
   * Clear event buffer for session
   */
  public clearBuffer(sessionId: string): void {
    this.eventBuffer.delete(sessionId);
    console.log('[SessionEventEmitter] Buffer cleared for session:', sessionId);
  }

  /**
   * Subscribe to all events for a session
   */
  public subscribe(
    sessionId: string,
    eventType: SSEEventType | '*',
    callback: EventCallback
  ): void {
    const eventKey = eventType === '*' ? this.getEventKey(sessionId) : this.getEventKey(sessionId, eventType);
    this.emitter.on(eventKey, callback);
    console.log('[SessionEventEmitter] Subscribed:', { sessionId, eventType });
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(
    sessionId: string,
    eventType: SSEEventType | '*',
    callback: EventCallback
  ): void {
    const eventKey = eventType === '*' ? this.getEventKey(sessionId) : this.getEventKey(sessionId, eventType);
    this.emitter.off(eventKey, callback);
    console.log('[SessionEventEmitter] Unsubscribed:', { sessionId, eventType });
  }

  /**
   * Unsubscribe all listeners for a session
   */
  public unsubscribeAll(sessionId: string): void {
    const prefix = `${sessionId}:`;
    const eventNames = this.emitter.eventNames();

    for (const eventName of eventNames) {
      if (typeof eventName === 'string' && eventName.startsWith(prefix)) {
        this.emitter.removeAllListeners(eventName);
      }
    }

    console.log('[SessionEventEmitter] Unsubscribed all for session:', sessionId);
  }

  /**
   * Emit event (internal helper)
   */
  private emitEvent(sessionId: string, event: SSEEventData): void {
    // Emit to specific event type listeners
    const specificKey = this.getEventKey(sessionId, event.event);
    this.emitter.emit(specificKey, event);

    // Emit to wildcard listeners
    const wildcardKey = this.getEventKey(sessionId);
    this.emitter.emit(wildcardKey, event);

    // Buffer for late subscribers
    this.bufferEvent(sessionId, event);
  }

  // ===========================
  // Type-Safe Event Emitters
  // ===========================

  public emitSessionStarted(sessionId: string, totalFiles: number): void {
    const event: SessionStartedEvent = {
      event: SSEEventType.SESSION_STARTED,
      timestamp: new Date().toISOString(),
      data: { sessionId, totalFiles },
    };
    this.emitEvent(sessionId, event);
  }

  public emitFileParsing(sessionId: string, fileId: string, filename: string): void {
    const event: FileParsingEvent = {
      event: SSEEventType.FILE_PARSING,
      timestamp: new Date().toISOString(),
      data: { fileId, filename },
    };
    this.emitEvent(sessionId, event);
  }

  public emitFileParsed(sessionId: string, fileId: string, filename: string, pageCount: number): void {
    const event: FileParsedEvent = {
      event: SSEEventType.FILE_PARSED,
      timestamp: new Date().toISOString(),
      data: { fileId, filename, pageCount },
    };
    this.emitEvent(sessionId, event);
  }

  public emitFileParsingFailed(sessionId: string, fileId: string, filename: string, error: string): void {
    const event: FileParsingFailedEvent = {
      event: SSEEventType.FILE_PARSING_FAILED,
      timestamp: new Date().toISOString(),
      data: { fileId, filename, error },
    };
    this.emitEvent(sessionId, event);
  }

  public emitDocumentDetected(sessionId: string, fileId: string, filename: string, documentCount: number): void {
    const event: DocumentDetectedEvent = {
      event: SSEEventType.DOCUMENT_DETECTED,
      timestamp: new Date().toISOString(),
      data: { fileId, filename, documentCount },
    };
    this.emitEvent(sessionId, event);
  }

  public emitExtractionStarted(
    sessionId: string,
    documentId: string,
    fileId: string,
    filename: string,
    chunkingStrategy: string
  ): void {
    const event: ExtractionStartedEvent = {
      event: SSEEventType.EXTRACTION_STARTED,
      timestamp: new Date().toISOString(),
      data: { documentId, fileId, filename, chunkingStrategy },
    };
    this.emitEvent(sessionId, event);
  }

  public emitExtractionProgress(
    sessionId: string,
    progress: number,
    filesProcessed: number,
    totalFiles: number,
    documentsProcessed: number = 0,
    totalDocuments: number = 0
  ): void {
    const event: ExtractionProgressEvent = {
      event: SSEEventType.EXTRACTION_PROGRESS,
      timestamp: new Date().toISOString(),
      data: { progress, filesProcessed, totalFiles, documentsProcessed, totalDocuments },
    };
    this.emitEvent(sessionId, event);
  }

  public emitExtractionCompleted(
    sessionId: string,
    documentId: string,
    fileId: string,
    filename: string,
    rowCount: number
  ): void {
    const event: ExtractionCompletedEvent = {
      event: SSEEventType.EXTRACTION_COMPLETED,
      timestamp: new Date().toISOString(),
      data: { documentId, fileId, filename, rowCount },
    };
    this.emitEvent(sessionId, event);
  }

  public emitExtractionFailed(
    sessionId: string,
    documentId: string,
    fileId: string,
    filename: string,
    error: string
  ): void {
    const event: ExtractionFailedEvent = {
      event: SSEEventType.EXTRACTION_FAILED,
      timestamp: new Date().toISOString(),
      data: { documentId, fileId, filename, error },
    };
    this.emitEvent(sessionId, event);
  }

  public emitSessionCompleted(
    sessionId: string,
    totalRows: number,
    totalFiles: number,
    totalDocuments: number,
    durationMs: number
  ): void {
    const event: SessionCompletedEvent = {
      event: SSEEventType.SESSION_COMPLETED,
      timestamp: new Date().toISOString(),
      data: { sessionId, totalRows, totalFiles, totalDocuments, durationMs },
    };
    this.emitEvent(sessionId, event);
  }

  public emitSessionFailed(sessionId: string, error: string): void {
    const event: SessionFailedEvent = {
      event: SSEEventType.SESSION_FAILED,
      timestamp: new Date().toISOString(),
      data: { sessionId, error },
    };
    this.emitEvent(sessionId, event);
  }

  public emitRateLimitWait(sessionId: string, waitTimeMs: number, reason: string): void {
    const event: RateLimitWaitEvent = {
      event: SSEEventType.RATE_LIMIT_WAIT,
      timestamp: new Date().toISOString(),
      data: { waitTimeMs, reason },
    };
    this.emitEvent(sessionId, event);
  }
}

// Export singleton instance
export const sessionEventEmitter = SessionEventEmitter.getInstance();

// Export class for testing
export default SessionEventEmitter;
