import { create } from 'zustand';
import { TemplateField } from '@/types/template';
import { ExtractedRow } from '@/types/extraction';

// CRITICAL: Use TemplateField from @/types/template (Story 3.5 type alignment)
// Re-export for backward compatibility
export type ExtractionField = TemplateField;

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

  // File upload state (Story 3.6)
  uploadedFile: File | null; // Uploaded file for extraction

  // Extraction state (Story 3.7)
  results: ExtractionResponse | null; // Extraction results in ExtractedRow[] format
  isExtracting: boolean; // True during extraction API call
  extractionError: string | null; // Error message from failed extraction

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

  // File upload actions (Story 3.6)
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
}

export const useExtractionStore = create<ExtractionStore>()((set) => ({
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

      // File upload initial state (Story 3.6)
      uploadedFile: null,

      // Extraction initial state (Story 3.7)
      results: null,
      isExtracting: false,
      extractionError: null,

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

      // File upload actions (Story 3.6)
      setUploadedFile: (file) =>
        set({
          uploadedFile: file,
        }),

      removeUploadedFile: () =>
        set({
          uploadedFile: null,
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
}));
