'use client';

import { useState, useEffect } from 'react';
import { useExtractionStore, type ExtractionField } from '@/stores/extractionStore';
import { FieldTagsArea } from './FieldTagsArea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { Template, TemplateWithRelations, TemplateField as DBTemplateField, TemplatePrompt } from '@/types/template';

export function TemplateSection() {
  const {
    templateMode,
    selectedTemplateId,
    selectedTemplateName,
    fields,
    extractionPrompt,
    isDirty,
    setTemplateMode,
    setExtractionPrompt,
    loadTemplate,
    resetTemplate,
  } = useExtractionStore();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch templates when "existing" mode is selected
  useEffect(() => {
    if (templateMode === 'existing') {
      fetchTemplates();
    }
  }, [templateMode]);

  const fetchTemplates = async () => {
    setIsLoadingTemplates(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      setLoadError(error.message);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleModeChange = (mode: string) => {
    if (mode === 'new' || mode === 'existing') {
      setTemplateMode(mode);
      if (mode === 'new') {
        resetTemplate();
      }
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    // For Story 3.2, we'll use the GET /api/templates endpoint and find by ID
    // In a future story, we might use GET /api/templates/:id for full details
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      const data = await response.json();
      const template = data.templates.find((t: Template) => t.id === templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      // For Story 3.2, we're working with a simplified structure
      // Convert DB template fields to extraction fields
      // Note: In Epic 1, templates use template_fields table
      // For Story 3.2, we'll load with empty fields as placeholder
      // TODO Story 3.4: Implement proper template loading with fields from DB

      const extractionFields: ExtractionField[] = [];
      const extractionPromptText = ''; // TODO: Load from template_prompts table

      loadTemplate(template.id, template.name, extractionFields, extractionPromptText);
    } catch (error: any) {
      console.error('Error loading template:', error);
      alert(`Failed to load template: ${error.message}`);
    }
  };

  const handleSaveTemplate = () => {
    // TODO Story 3.5: Implement Save Template Modal and save functionality
    console.log('Save template clicked - will be implemented in Story 3.5');
    alert('Save template functionality will be implemented in Story 3.5');
  };

  const promptLength = extractionPrompt.length;
  const promptRemaining = 2000 - promptLength;
  const canSaveTemplate = fields.length > 0;

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Template Mode</Label>
        <RadioGroup value={templateMode} onValueChange={handleModeChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="new" id="mode-new" />
            <Label htmlFor="mode-new" className="font-normal cursor-pointer">
              New Template
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="existing" id="mode-existing" />
            <Label htmlFor="mode-existing" className="font-normal cursor-pointer">
              Load Existing Template
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Load Existing Template Dropdown */}
      {templateMode === 'existing' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Template</Label>
          {isLoadingTemplates ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading templates...
            </div>
          ) : loadError ? (
            <div className="text-sm text-red-500">
              Error: {loadError}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-gray-500">
              No templates found. Create a new template first.
            </div>
          ) : (
            <Select
              value={selectedTemplateId || undefined}
              onValueChange={handleTemplateSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Current Template Name (if loaded) */}
      {selectedTemplateName && (
        <div className="text-sm">
          <span className="text-gray-600">Template: </span>
          <span className="font-medium">{selectedTemplateName}</span>
          {isDirty && <span className="ml-2 text-amber-600">• (unsaved changes)</span>}
        </div>
      )}

      {/* Field Tags Area */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Extraction Fields</Label>
        <FieldTagsArea />
      </div>

      {/* Extraction Instructions */}
      <div className="space-y-2">
        <Label htmlFor="extraction-prompt" className="text-sm font-medium">
          Extraction Instructions (Optional)
        </Label>
        <Textarea
          id="extraction-prompt"
          value={extractionPrompt}
          onChange={(e) => setExtractionPrompt(e.target.value)}
          placeholder="Add global extraction instructions that apply to all fields, e.g., 'Extract all dates in YYYY-MM-DD format' or 'Preserve original formatting for addresses'"
          maxLength={2000}
          rows={5}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          {promptLength}/2000 characters
          {promptRemaining < 200 && promptRemaining >= 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              ({promptRemaining} remaining)
            </span>
          )}
        </p>
      </div>

      {/* Save Template Button */}
      <div className="pt-2">
        <Button
          onClick={handleSaveTemplate}
          disabled={!canSaveTemplate}
          className="w-full"
          variant={isDirty ? 'default' : 'secondary'}
        >
          <Save className="h-4 w-4 mr-2" />
          {templateMode === 'new' ? 'Save Template' : `Update "${selectedTemplateName}"`}
          {isDirty && ' •'}
        </Button>
        {!canSaveTemplate && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Add at least one field to save the template
          </p>
        )}
      </div>
    </div>
  );
}
