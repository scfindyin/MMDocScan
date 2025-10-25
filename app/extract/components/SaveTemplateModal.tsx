'use client';

import { useState } from 'react';
import { useExtractionStore } from '@/stores/extractionStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Template, CreateTemplateRequest, UpdateTemplateRequest } from '@/types/template';

interface SaveTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: (template: Template) => void;
  existingTemplates: Template[];
}

type SaveMode = 'replace' | 'new';

export function SaveTemplateModal({
  open,
  onOpenChange,
  onSaveSuccess,
  existingTemplates,
}: SaveTemplateModalProps) {
  const {
    templateMode,
    selectedTemplateId,
    selectedTemplateName,
    fields,
    extractionPrompt,
    clearDirty,
  } = useExtractionStore();

  const isExistingTemplate = templateMode === 'existing' && selectedTemplateId;

  // Form state
  const [templateName, setTemplateName] = useState(selectedTemplateName || '');
  const [saveMode, setSaveMode] = useState<SaveMode>('replace');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTemplateName(selectedTemplateName || '');
      setSaveMode('replace');
      setNewTemplateName('');
      setValidationError(null);
    }
    onOpenChange(newOpen);
  };

  // Validate template name
  const validateTemplateName = (name: string): string | null => {
    if (!name || name.trim().length === 0) {
      return 'Template name is required';
    }
    if (name.length > 100) {
      return 'Template name must be 100 characters or less';
    }

    // Check for duplicate names (client-side UX optimization)
    const isDuplicate = existingTemplates.some(
      (t) => t.name.toLowerCase() === name.toLowerCase() && t.id !== selectedTemplateId
    );
    if (isDuplicate) {
      return 'A template with this name already exists. Please choose a different name.';
    }

    return null;
  };

  // Handle save action
  const handleSave = async () => {
    setValidationError(null);

    // Determine which name to use
    const nameToSave = isExistingTemplate && saveMode === 'replace'
      ? selectedTemplateName!
      : isExistingTemplate && saveMode === 'new'
      ? newTemplateName
      : templateName;

    // Validate name
    const error = validateTemplateName(nameToSave);
    if (error) {
      setValidationError(error);
      return;
    }

    // Validate fields
    if (fields.length === 0) {
      setValidationError('At least one field is required');
      return;
    }

    setIsLoading(true);

    try {
      // Determine API endpoint and method
      if (isExistingTemplate && saveMode === 'replace') {
        // Replace existing template (PUT)
        await updateTemplate(selectedTemplateId!, nameToSave);
      } else {
        // Create new template (POST)
        await createTemplate(nameToSave);
      }
    } catch (error: any) {
      console.error('Error saving template:', error);

      // Handle 400 duplicate error from API (server-side validation)
      if (error.message.includes('already exists')) {
        setValidationError('Template name already exists. Please choose a different name.');
      } else if (error.message.includes('Unauthorized')) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in to save templates.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Unable to save template. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Create new template
  const createTemplate = async (name: string) => {
    const requestBody: CreateTemplateRequest = {
      name,
      fields,
      extraction_prompt: extractionPrompt || undefined,
    };

    const response = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create template');
    }

    const data = await response.json();
    const template: Template = data.template;

    // Success!
    toast({
      title: 'Template Saved',
      description: `Template "${name}" has been saved successfully.`,
    });

    clearDirty();
    onSaveSuccess(template);
    handleOpenChange(false);
  };

  // Update existing template
  const updateTemplate = async (id: string, name: string) => {
    const requestBody: UpdateTemplateRequest = {
      name,
      fields,
      extraction_prompt: extractionPrompt || undefined,
    };

    const response = await fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update template');
    }

    const data = await response.json();
    const template: Template = data.template;

    // Success!
    toast({
      title: 'Template Updated',
      description: `Template "${name}" has been updated successfully.`,
    });

    clearDirty();
    onSaveSuccess(template);
    handleOpenChange(false);
  };

  // Template summary
  const fieldCount = fields.length;
  const hasPrompt = extractionPrompt.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Template</DialogTitle>
          <DialogDescription>
            Save your template configuration for future use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1">
            <p className="text-sm font-medium text-slate-700">Template Summary</p>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>{fieldCount} {fieldCount === 1 ? 'field' : 'fields'}</span>
              <span className="text-slate-300">•</span>
              <span>{hasPrompt ? 'Custom prompt included' : 'No custom prompt'}</span>
            </div>
          </div>

          {/* Existing Template: Replace vs Save as New */}
          {isExistingTemplate && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Save Options</Label>
              <RadioGroup value={saveMode} onValueChange={(v) => setSaveMode(v as SaveMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="mode-replace" />
                  <Label htmlFor="mode-replace" className="font-normal cursor-pointer">
                    Replace &ldquo;{selectedTemplateName}&rdquo;
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="mode-new" />
                  <Label htmlFor="mode-new" className="font-normal cursor-pointer">
                    Save as new template
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Template Name Input */}
          {(!isExistingTemplate || saveMode === 'new') && (
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-name"
                value={isExistingTemplate && saveMode === 'new' ? newTemplateName : templateName}
                onChange={(e) => {
                  setValidationError(null);
                  if (isExistingTemplate && saveMode === 'new') {
                    setNewTemplateName(e.target.value);
                  } else {
                    setTemplateName(e.target.value);
                  }
                }}
                placeholder="Enter template name"
                maxLength={100}
                disabled={isLoading}
                className={validationError ? 'border-red-500' : ''}
              />
              {validationError && (
                <p className="text-sm text-red-500">{validationError}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isExistingTemplate && saveMode === 'replace' ? 'Update' : 'Save'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
