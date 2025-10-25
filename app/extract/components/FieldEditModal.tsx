'use client';

import { useState, useEffect } from 'react';
import { useExtractionStore, type ExtractionField } from '@/stores/extractionStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FieldEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  field?: ExtractionField | null; // Null/undefined = new field, otherwise edit mode
}

export function FieldEditModal({ isOpen, onClose, field }: FieldEditModalProps) {
  const { addField, updateField, fields } = useExtractionStore();

  const [fieldName, setFieldName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [nameError, setNameError] = useState('');

  // Initialize form when field changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFieldName(field?.name || '');
      setInstructions(field?.instructions || '');
      setNameError('');
    }
  }, [isOpen, field]);

  const validateFieldName = (name: string): boolean => {
    if (!name.trim()) {
      setNameError('Field name is required');
      return false;
    }
    if (name.length > 100) {
      setNameError('Field name must be 100 characters or less');
      return false;
    }
    // Check for duplicate names (excluding current field if editing)
    const isDuplicate = fields.some(
      (f) => f.name.toLowerCase() === name.trim().toLowerCase() && f.id !== field?.id
    );
    if (isDuplicate) {
      setNameError('A field with this name already exists');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSave = () => {
    if (!validateFieldName(fieldName)) {
      return;
    }

    // Validate instructions length
    if (instructions.length > 500) {
      return; // Should be prevented by maxLength on textarea
    }

    if (field) {
      // Edit existing field
      updateField(field.id, fieldName.trim(), instructions.trim() || undefined);
    } else {
      // Add new field
      addField(fieldName.trim(), instructions.trim() || undefined);
    }

    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  const instructionsLength = instructions.length;
  const instructionsRemaining = 500 - instructionsLength;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{field ? 'Edit Field' : 'Add New Field'}</DialogTitle>
          <DialogDescription>
            {field
              ? 'Update the field name and optional instructions.'
              : 'Enter a field name and optional extraction instructions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Field Name Input */}
          <div className="grid gap-2">
            <Label htmlFor="field-name">
              Field Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="field-name"
              value={fieldName}
              onChange={(e) => {
                setFieldName(e.target.value);
                setNameError('');
              }}
              onBlur={() => validateFieldName(fieldName)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Invoice Number, Total Amount"
              maxLength={100}
              className={nameError ? 'border-red-500' : ''}
              autoFocus
            />
            {nameError && (
              <p className="text-sm text-red-500">{nameError}</p>
            )}
            <p className="text-xs text-gray-500">
              {fieldName.length}/100 characters
            </p>
          </div>

          {/* Instructions Textarea */}
          <div className="grid gap-2">
            <Label htmlFor="field-instructions">
              Field Instructions (Optional)
            </Label>
            <Textarea
              id="field-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add specific extraction instructions for this field, e.g., 'Extract as YYYY-MM-DD format' or 'Include currency symbol'"
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              {instructionsLength}/500 characters
              {instructionsRemaining < 50 && instructionsRemaining >= 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  ({instructionsRemaining} remaining)
                </span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!fieldName.trim() || !!nameError}
          >
            {field ? 'Update Field' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
