/**
 * GET /api/extractions/batch/:id/stream
 * Story 3.11: SSE endpoint for real-time progress updates
 */

import { NextRequest } from 'next/server';
import { sessionStore } from '@/lib/services/SessionStore';
import { sessionEventEmitter } from '@/lib/services/SessionEventEmitter';
import { SSEEventData } from '@/types/sseEvents';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;

  // Verify session exists
  const session = sessionStore.getSession(sessionId);
  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Create SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      console.log('[SSE] Client connected:', sessionId);

      // Send initial buffered events
      const bufferedEvents = sessionEventEmitter.getBufferedEvents(sessionId);
      for (const event of bufferedEvents) {
        sendEvent(controller, encoder, event);
      }

      // Subscribe to new events
      const eventHandler = (event: SSEEventData) => {
        sendEvent(controller, encoder, event);

        // Close stream on completion/failure
        if (
          event.event === 'session_completed' ||
          event.event === 'session_failed'
        ) {
          setTimeout(() => {
            controller.close();
            sessionEventEmitter.unsubscribeAll(sessionId);
            console.log('[SSE] Stream closed:', sessionId);
          }, 1000);
        }
      };

      sessionEventEmitter.subscribe(sessionId, '*', eventHandler);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        sessionEventEmitter.unsubscribeAll(sessionId);
        console.log('[SSE] Client disconnected:', sessionId);
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Send SSE event to stream
 */
function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: SSEEventData
): void {
  try {
    const eventType = event.event;
    const eventData = JSON.stringify(event);
    const sseMessage = `event: ${eventType}\ndata: ${eventData}\n\n`;

    controller.enqueue(encoder.encode(sseMessage));
  } catch (error) {
    console.error('[SSE] Error sending event:', error);
  }
}
