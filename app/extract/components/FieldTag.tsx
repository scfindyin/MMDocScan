'use client';

import { type ExtractionField } from '@/stores/extractionStore';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FieldTagProps {
  field: ExtractionField;
  onEdit: (field: ExtractionField) => void;
  onDelete: (fieldId: string) => void;
}

export function FieldTag({ field, onEdit, onDelete }: FieldTagProps) {
  const hasInstructions = !!field.instructions && field.instructions.trim().length > 0;

  // useSortable hook for drag-and-drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 300ms ease',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer group"
      onClick={() => onEdit(field)}
      title={hasInstructions ? `Has instructions: ${field.instructions}` : 'Click to edit'}
      aria-label="Drag to reorder, press enter to edit"
    >
      {/* Drag handle icon - only this element triggers drag */}
      <span
        {...attributes}
        {...listeners}
        className="text-gray-400 cursor-grab active:cursor-grabbing select-none"
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()} // Prevent edit when clicking drag handle
      >
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
