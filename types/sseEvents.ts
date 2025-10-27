/**
 * Server-Sent Events (SSE) Types
 * Story 3.11: Real-Time Progress Streaming
 */

/**
 * SSE Event Types
 * All events emitted during batch extraction
 */
export enum SSEEventType {
  SESSION_STARTED = 'session_started',
  FILE_PARSING = 'file_parsing',
  FILE_PARSED = 'file_parsed',
  FILE_PARSING_FAILED = 'file_parsing_failed',
  DOCUMENT_DETECTED = 'document_detected',
  EXTRACTION_STARTED = 'extraction_started',
  EXTRACTION_PROGRESS = 'extraction_progress',
  EXTRACTION_COMPLETED = 'extraction_completed',
  EXTRACTION_FAILED = 'extraction_failed',
  EXTRACTION_TIMEOUT = 'extraction_timeout',
  RATE_LIMIT_WAIT = 'rate_limit_wait',
  NETWORK_ERROR = 'network_error',
  INVALID_RESPONSE = 'invalid_response',
  SESSION_COMPLETED = 'session_completed',
  SESSION_FAILED = 'session_failed'
}

/**
 * Base SSE Event
 */
export interface SSEEvent {
  event: SSEEventType;
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Session Started Event
 */
export interface SessionStartedEvent extends SSEEvent {
  event: SSEEventType.SESSION_STARTED;
  data: {
    sessionId: string;
    totalFiles: number;
  };
}

/**
 * File Parsing Event
 */
export interface FileParsingEvent extends SSEEvent {
  event: SSEEventType.FILE_PARSING;
  data: {
    fileId: string;
    filename: string;
  };
}

/**
 * File Parsed Event
 */
export interface FileParsedEvent extends SSEEvent {
  event: SSEEventType.FILE_PARSED;
  data: {
    fileId: string;
    filename: string;
    pageCount: number;
  };
}

/**
 * File Parsing Failed Event
 */
export interface FileParsingFailedEvent extends SSEEvent {
  event: SSEEventType.FILE_PARSING_FAILED;
  data: {
    fileId: string;
    filename: string;
    error: string;
  };
}

/**
 * Document Detected Event
 */
export interface DocumentDetectedEvent extends SSEEvent {
  event: SSEEventType.DOCUMENT_DETECTED;
  data: {
    fileId: string;
    filename: string;
    documentCount: number;
  };
}

/**
 * Extraction Started Event
 */
export interface ExtractionStartedEvent extends SSEEvent {
  event: SSEEventType.EXTRACTION_STARTED;
  data: {
    documentId: string;
    fileId: string;
    filename: string;
    chunkingStrategy: string;
  };
}

/**
 * Extraction Progress Event
 */
export interface ExtractionProgressEvent extends SSEEvent {
  event: SSEEventType.EXTRACTION_PROGRESS;
  data: {
    progress: number; // 0-100
    filesProcessed: number;
    totalFiles: number;
    documentsProcessed: number;
    totalDocuments: number;
  };
}

/**
 * Extraction Completed Event
 */
export interface ExtractionCompletedEvent extends SSEEvent {
  event: SSEEventType.EXTRACTION_COMPLETED;
  data: {
    documentId: string;
    fileId: string;
    filename: string;
    rowCount: number;
  };
}

/**
 * Extraction Failed Event
 */
export interface ExtractionFailedEvent extends SSEEvent {
  event: SSEEventType.EXTRACTION_FAILED;
  data: {
    documentId: string;
    fileId: string;
    filename: string;
    error: string;
  };
}

/**
 * Extraction Timeout Event
 */
export interface ExtractionTimeoutEvent extends SSEEvent {
  event: SSEEventType.EXTRACTION_TIMEOUT;
  data: {
    documentId: string;
    fileId: string;
    filename: string;
    timeoutMs: number;
  };
}

/**
 * Rate Limit Wait Event
 */
export interface RateLimitWaitEvent extends SSEEvent {
  event: SSEEventType.RATE_LIMIT_WAIT;
  data: {
    waitTimeMs: number;
    reason: string;
  };
}

/**
 * Network Error Event
 */
export interface NetworkErrorEvent extends SSEEvent {
  event: SSEEventType.NETWORK_ERROR;
  data: {
    documentId: string;
    error: string;
    retryAttempt: number;
  };
}

/**
 * Invalid Response Event
 */
export interface InvalidResponseEvent extends SSEEvent {
  event: SSEEventType.INVALID_RESPONSE;
  data: {
    documentId: string;
    error: string;
  };
}

/**
 * Session Completed Event
 */
export interface SessionCompletedEvent extends SSEEvent {
  event: SSEEventType.SESSION_COMPLETED;
  data: {
    sessionId: string;
    totalRows: number;
    totalFiles: number;
    totalDocuments: number;
    durationMs: number;
  };
}

/**
 * Session Failed Event
 */
export interface SessionFailedEvent extends SSEEvent {
  event: SSEEventType.SESSION_FAILED;
  data: {
    sessionId: string;
    error: string;
  };
}

/**
 * Union type of all SSE events
 */
export type SSEEventData =
  | SessionStartedEvent
  | FileParsingEvent
  | FileParsedEvent
  | FileParsingFailedEvent
  | DocumentDetectedEvent
  | ExtractionStartedEvent
  | ExtractionProgressEvent
  | ExtractionCompletedEvent
  | ExtractionFailedEvent
  | ExtractionTimeoutEvent
  | RateLimitWaitEvent
  | NetworkErrorEvent
  | InvalidResponseEvent
  | SessionCompletedEvent
  | SessionFailedEvent;
