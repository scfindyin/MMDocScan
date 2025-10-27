/**
 * SessionStore Unit Tests
 * Story 3.11: In-Memory Session Management
 */

import SessionStore from '../SessionStore';
import { TemplateSnapshot, CustomColumn, FileProcessingStatus } from '@/types/batchExtraction';

describe('SessionStore', () => {
  let store: SessionStore;

  const mockTemplate: TemplateSnapshot = {
    fields: [{ id: '1', name: 'test_field', order: 1 }],
    extraction_prompt: 'Extract data',
  };

  const mockFiles: FileProcessingStatus[] = [
    { fileId: 'file1', filename: 'test.pdf', size: 1000, status: 'pending' },
  ];

  beforeEach(() => {
    store = SessionStore.getInstance();
    store.clearAll();
  });

  afterAll(() => {
    store.stopCleanupInterval();
  });

  describe('Session CRUD', () => {
    it('should create session with unique ID', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      expect(sessionId).toBeTruthy();
      expect(typeof sessionId).toBe('string');
    });

    it('should retrieve created session', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      const session = store.getSession(sessionId);
      expect(session).toBeTruthy();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.status).toBe('pending');
    });

    it('should return null for non-existent session', () => {
      const session = store.getSession('nonexistent');
      expect(session).toBeNull();
    });

    it('should delete session', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      store.deleteSession(sessionId);
      const session = store.getSession(sessionId);
      expect(session).toBeNull();
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress and status', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      store.updateProgress(sessionId, 50, 'processing');
      const session = store.getSession(sessionId);
      expect(session?.progress).toBe(50);
      expect(session?.status).toBe('processing');
    });

    it('should add results to session', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      const mockResults = [
        { rowId: '1', confidence: 0.9, fields: { test: 'value' }, sourceMetadata: { filename: 'test.pdf', extractedAt: new Date().toISOString() } },
      ];
      store.addResults(sessionId, mockResults);
      const session = store.getSession(sessionId);
      expect(session?.results).toHaveLength(1);
    });

    it('should mark session as completed', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      store.markCompleted(sessionId);
      const session = store.getSession(sessionId);
      expect(session?.status).toBe('completed');
      expect(session?.progress).toBe(100);
      expect(session?.completedAt).toBeTruthy();
    });

    it('should set error status', () => {
      const sessionId = store.createSession(mockTemplate, mockFiles);
      store.setError(sessionId, 'Test error');
      const session = store.getSession(sessionId);
      expect(session?.status).toBe('failed');
      expect(session?.errorMessage).toBe('Test error');
      expect(session?.completedAt).toBeTruthy();
    });
  });

  describe('TTL Cleanup', () => {
    it('should cleanup expired sessions', () => {
      jest.useFakeTimers();
      const sessionId = store.createSession(mockTemplate, mockFiles);

      // Advance time by 6 minutes (beyond 5-minute TTL)
      jest.advanceTimersByTime(6 * 60 * 1000);

      store.cleanupExpiredSessions();
      const session = store.getSession(sessionId);
      expect(session).toBeNull();

      jest.useRealTimers();
    });
  });

  describe('Utility Methods', () => {
    it('should get session count', () => {
      store.createSession(mockTemplate, mockFiles);
      store.createSession(mockTemplate, mockFiles);
      expect(store.getSessionCount()).toBe(2);
    });

    it('should get all sessions', () => {
      store.createSession(mockTemplate, mockFiles);
      store.createSession(mockTemplate, mockFiles);
      const sessions = store.getAllSessions();
      expect(sessions).toHaveLength(2);
    });

    it('should clear all sessions', () => {
      store.createSession(mockTemplate, mockFiles);
      store.clearAll();
      expect(store.getSessionCount()).toBe(0);
    });
  });
});
