import { create } from 'zustand';
import { TemplateField } from '@/types/template';
import { ExtractedRow } from '@/types/extraction';
import {
  UploadedFile,
  FileStatus,
  createUploadedFile,
  validateFiles,
  debounce,
  FILE_UPLOAD_LIMITS
} from '@/lib/utils/file';

// CRITICAL: Use TemplateField from @/types/template (Story 3.5 type alignment)
// Re-export for backward compatibility
export type ExtractionField = TemplateField;

// Re-export file types for convenience
export type { UploadedFile, FileStatus } from '@/lib/utils/file';

// Template mode type
export type TemplateMode = 'new' | 'existing';

// Re-export ExtractedRow from types/extraction for convenience
export type { ExtractedRow } from '@/types/extraction';

// Extraction response format (Story 3.7 - matches Story 2.3 format)
export interface ExtractionResponse {
  success: true;
  data: ExtractedRow[];
  rowCount: number;
  filename: string;
}

interface ExtractionStore {
  // Panel state
  leftPanelSize: number; // 0-100 percentage
  rightPanelSize: number; // 0-100 percentage
  isLeftMaximized: boolean;
  isRightMaximized: boolean;

  // Template state (Story 3.2)
  templateMode: TemplateMode; // 'new' or 'existing'
  selectedTemplateId: string | null; // ID of loaded template
  selectedTemplateName: string | null; // Name of loaded template
  fields: ExtractionField[]; // Array of extraction fields
  extractionPrompt: string; // Global extraction instructions (0-2000 chars)
  isDirty: boolean; // True if template has unsaved changes

  // File upload state (Story 3.8 - Multi-file support)
  uploadedFiles: UploadedFile[]; // Array of uploaded files
  isAddingFiles: boolean; // Prevent race conditions during file addition

  // Legacy support for Story 3.7 (will be removed in future)
  uploadedFile: File | null; // Single file for backward compatibility

  // Extraction state (Story 3.7)
  results: ExtractionResponse | null; // Extraction results in ExtractedRow[] format
  isExtracting: boolean; // True during extraction API call
  extractionError: string | null; // Error message from failed extraction

  // Batch extraction state (Story 3.11)
  sessionId: string | null; // Current batch extraction session ID
  progressStatus: string | null; // Current phase: parsing, detecting, extracting, completed
  progressPercent: number; // 0-100
  filesProcessed: number; // Count of files processed
  totalFiles: number; // Total files in batch
  documentsProcessed: number; // Count of documents processed
  totalDocuments: number; // Total documents detected

  // Actions
  setPanelSizes: (left: number, right: number) => void;
  maximizeLeft: () => void;
  maximizeRight: () => void;
  restoreLeft: () => void;
  restoreRight: () => void;

  // Template actions (Story 3.2)
  setTemplateMode: (mode: TemplateMode) => void;
  addField: (name: string, instructions?: string) => void;
  updateField: (id: string, name: string, instructions?: string) => void;
  removeField: (id: string) => void;
  reorderFields: (fields: ExtractionField[]) => void; // For Story 3.3 drag-and-drop
  setExtractionPrompt: (prompt: string) => void;
  loadTemplate: (templateId: string, templateName: string, fields: ExtractionField[], prompt: string) => void;
  resetTemplate: () => void; // Clear all template state

  // File upload actions (Story 3.8 - Multi-file support)
  addFiles: (files: File[]) => void;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  updateFileStatus: (fileId: string, status: FileStatus, errorMessage?: string) => void;
  retryFile: (fileId: string) => void;

  // Computed properties
  getTotalSize: () => number;
  getTotalPageCount: () => number;
  getFileCount: () => number;

  // Legacy actions for Story 3.7 compatibility
  setUploadedFile: (file: File | null) => void;
  removeUploadedFile: () => void;

  // Dirty tracking actions (Story 3.5)
  setDirty: () => void; // Mark template as having unsaved changes
  clearDirty: () => void; // Mark template as saved (alias for markClean)
  markClean: () => void; // Legacy alias for clearDirty

  // Extraction actions (Story 3.7)
  setResults: (results: ExtractionResponse) => void;
  clearResults: () => void;
  setIsExtracting: (isExtracting: boolean) => void;
  setExtractionError: (error: string | null) => void;

  // Batch extraction actions (Story 3.11)
  setSessionId: (sessionId: string | null) => void;
  setProgressStatus: (status: string | null) => void;
  setProgressPercent: (percent: number) => void;
  updateProgress: (filesProcessed: number, totalFiles: number, documentsProcessed: number, totalDocuments: number) => void;
  resetProgress: () => void;
}

export const useExtractionStore = create<ExtractionStore>()((set, get) => ({
      // Initial state - default sizes
      leftPanelSize: 30, // 300px at 1000px viewport
      rightPanelSize: 70, // Fluid (remaining space)
      isLeftMaximized: false,
      isRightMaximized: false,

      // Template initial state (Story 3.2)
      templateMode: 'new',
      selectedTemplateId: null,
      selectedTemplateName: null,
      fields: [],
      extractionPrompt: '',
      isDirty: false,

      // File upload initial state (Story 3.8 - Multi-file)
      uploadedFiles: [],
      isAddingFiles: false,
      uploadedFile: null, // Legacy support

      // Extraction initial state (Story 3.7)
      results: null,
      isExtracting: false,
      extractionError: null,

      // Batch extraction initial state (Story 3.11)
      sessionId: null,
      progressStatus: null,
      progressPercent: 0,
      filesProcessed: 0,
      totalFiles: 0,
      documentsProcessed: 0,
      totalDocuments: 0,

      // Actions
      setPanelSizes: (left, right) =>
        set({
          leftPanelSize: left,
          rightPanelSize: right,
        }),

      maximizeLeft: () =>
        set((state) => ({
          isLeftMaximized: true,
          isRightMaximized: false,
          // Store current sizes before maximizing (for restore)
          leftPanelSize: state.isLeftMaximized ? state.leftPanelSize : 95,
          rightPanelSize: 5, // Thin bar (~20px)
        })),

      maximizeRight: () =>
        set((state) => ({
          isLeftMaximized: false,
          isRightMaximized: true,
          leftPanelSize: 5, // Thin bar (~20px)
          // Store current sizes before maximizing (for restore)
          rightPanelSize: state.isRightMaximized ? state.rightPanelSize : 95,
        })),

      restoreLeft: () =>
        set({
          isLeftMaximized: false,
          leftPanelSize: 30, // Restore to default
          rightPanelSize: 70,
        }),

      restoreRight: () =>
        set({
          isRightMaximized: false,
          leftPanelSize: 30, // Restore to default
          rightPanelSize: 70,
        }),

      // Template actions (Story 3.2)
      setTemplateMode: (mode) =>
        set((state) => {
          // Only reset state when switching TO 'new' mode
          if (mode === 'new') {
            return {
              templateMode: mode,
              selectedTemplateId: null,
              selectedTemplateName: null,
              fields: [],
              extractionPrompt: '',
              isDirty: false,
            };
          }
          // When switching to 'existing', just update the mode
          return {
            templateMode: mode,
          };
        }),

      addField: (name, instructions) =>
        set((state) => ({
          fields: [
            ...state.fields,
            {
              id: crypto.randomUUID(), // Generate unique client-side ID
              name,
              instructions,
              order: state.fields.length, // Append to end
            },
          ],
          isDirty: true,
        })),

      updateField: (id, name, instructions) =>
        set((state) => ({
          fields: state.fields.map((field) =>
            field.id === id ? { ...field, name, instructions } : field
          ),
          isDirty: true,
        })),

      removeField: (id) =>
        set((state) => ({
          fields: state.fields
            .filter((field) => field.id !== id)
            .map((field, index) => ({ ...field, order: index })), // Reorder after deletion
          isDirty: true,
        })),

      reorderFields: (fields) =>
        set({
          fields: fields.map((field, index) => ({ ...field, order: index })),
          isDirty: true,
        }),

      setExtractionPrompt: (prompt) =>
        set({
          extractionPrompt: prompt,
          isDirty: true,
        }),

      loadTemplate: (templateId, templateName, fields, prompt) =>
        set({
          templateMode: 'existing',
          selectedTemplateId: templateId,
          selectedTemplateName: templateName,
          fields,
          extractionPrompt: prompt,
          isDirty: false, // Freshly loaded template is clean
        }),

      resetTemplate: () =>
        set({
          templateMode: 'new',
          selectedTemplateId: null,
          selectedTemplateName: null,
          fields: [],
          extractionPrompt: '',
          isDirty: false,
        }),

      // File upload actions (Story 3.8 - Multi-file support)
      addFiles: debounce((files: File[]) => {
        set((state) => {
          // Prevent race conditions
          if (state.isAddingFiles) return state;

          // Validate files
          const validation = validateFiles(state.uploadedFiles, files);
          if (!validation.valid) {
            alert(validation.error);
            return state;
          }

          // Create UploadedFile objects
          const newUploadedFiles = files.map(createUploadedFile);

          // Check for duplicates by filename
          const existingFilenames = new Set(state.uploadedFiles.map(f => f.filename));
          const uniqueNewFiles = newUploadedFiles.filter(
            f => !existingFilenames.has(f.filename)
          );

          if (uniqueNewFiles.length < newUploadedFiles.length) {
            const duplicateCount = newUploadedFiles.length - uniqueNewFiles.length;
            console.warn(`${duplicateCount} duplicate file(s) were not added`);
          }

          // Mark files as ready after brief validation
          setTimeout(() => {
            set((state) => ({
              uploadedFiles: state.uploadedFiles.map(f =>
                uniqueNewFiles.find(nf => nf.id === f.id)
                  ? { ...f, status: 'ready' as FileStatus }
                  : f
              ),
              isAddingFiles: false,
            }));
          }, 500);

          // Update legacy single file for backward compatibility
          const allFiles = [...state.uploadedFiles, ...uniqueNewFiles];
          const legacyFile = allFiles.length > 0 ? allFiles[0].file : null;

          return {
            uploadedFiles: [...state.uploadedFiles, ...uniqueNewFiles],
            isAddingFiles: true,
            uploadedFile: legacyFile,
          };
        });
      }, FILE_UPLOAD_LIMITS.DEBOUNCE_DELAY),

      removeFile: (fileId) =>
        set((state) => {
          const updatedFiles = state.uploadedFiles.filter(f => f.id !== fileId);
          const legacyFile = updatedFiles.length > 0 ? updatedFiles[0].file : null;

          return {
            uploadedFiles: updatedFiles,
            uploadedFile: legacyFile,
          };
        }),

      clearAllFiles: () =>
        set({
          uploadedFiles: [],
          uploadedFile: null,
          isAddingFiles: false,
        }),

      updateFileStatus: (fileId, status, errorMessage) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map(f =>
            f.id === fileId
              ? { ...f, status, errorMessage }
              : f
          ),
        })),

      retryFile: (fileId) =>
        set((state) => ({
          uploadedFiles: state.uploadedFiles.map(f =>
            f.id === fileId
              ? { ...f, status: 'pending' as FileStatus, errorMessage: undefined }
              : f
          ),
        })),

      // Computed properties
      getTotalSize: () => {
        return get().uploadedFiles.reduce((sum, f) => sum + f.size, 0);
      },

      getTotalPageCount: () => {
        return get().uploadedFiles.reduce(
          (sum, f) => sum + (f.pageCount || 0),
          0
        );
      },

      getFileCount: () => {
        return get().uploadedFiles.length;
      },

      // Legacy actions for Story 3.7 compatibility
      setUploadedFile: (file) =>
        set((state) => {
          if (!file) {
            return {
              uploadedFile: null,
              uploadedFiles: [],
            };
          }

          // Convert single file to multi-file format
          const uploadedFile = createUploadedFile(file);
          uploadedFile.status = 'ready'; // Skip validation for legacy

          return {
            uploadedFile: file,
            uploadedFiles: [uploadedFile],
          };
        }),

      removeUploadedFile: () =>
        set({
          uploadedFile: null,
          uploadedFiles: [],
        }),

      // Dirty tracking actions (Story 3.5)
      setDirty: () =>
        set({
          isDirty: true,
        }),

      clearDirty: () =>
        set({
          isDirty: false,
        }),

      markClean: () =>
        set({
          isDirty: false,
        }),

      // Extraction actions (Story 3.7)
      setResults: (results) =>
        set({
          results,
          extractionError: null,
        }),

      clearResults: () =>
        set({
          results: null,
          extractionError: null,
        }),

      setIsExtracting: (isExtracting) => set({ isExtracting }),

      setExtractionError: (error) =>
        set({
          extractionError: error,
          isExtracting: false,
        }),

      // Batch extraction actions (Story 3.11)
      setSessionId: (sessionId) => set({ sessionId }),

      setProgressStatus: (status) => set({ progressStatus: status }),

      setProgressPercent: (percent) => set({ progressPercent: percent }),

      updateProgress: (filesProcessed, totalFiles, documentsProcessed, totalDocuments) =>
        set({
          filesProcessed,
          totalFiles,
          documentsProcessed,
          totalDocuments,
          progressPercent: totalFiles > 0 ? Math.round((filesProcessed / totalFiles) * 100) : 0,
        }),

      resetProgress: () =>
        set({
          sessionId: null,
          progressStatus: null,
          progressPercent: 0,
          filesProcessed: 0,
          totalFiles: 0,
          documentsProcessed: 0,
          totalDocuments: 0,
        }),
}));
