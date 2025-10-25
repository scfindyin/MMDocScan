'use client';

import { type ExtractionField } from '@/stores/extractionStore';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FieldTagProps {
  field: ExtractionField;
  onEdit: (field: ExtractionField) => void;
  onDelete: (fieldId: string) => void;
}

export function FieldTag({ field, onEdit, onDelete }: FieldTagProps) {
  const hasInstructions = !!field.instructions && field.instructions.trim().length > 0;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer group"
      onClick={() => onEdit(field)}
      title={hasInstructions ? `Has instructions: ${field.instructions}` : 'Click to edit'}
    >
      {/* Drag handle icon (placeholder for Story 3.3) */}
      <span className="text-gray-400 cursor-grab active:cursor-grabbing select-none" title="Drag to reorder (Story 3.3)">
        ⠿
      </span>

      {/* Field name */}
      <span className="text-sm font-medium text-gray-700 select-none">
        {field.name}
      </span>

      {/* Notes indicator (if instructions exist) */}
      {hasInstructions && (
        <span className="text-sm" title="Has field-specific instructions">
          📝
        </span>
      )}

      {/* Delete button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering onEdit
          onDelete(field.id);
        }}
        title="Delete field"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
