'use client';

import { useState } from 'react';
import { useExtractionStore, type ExtractionField } from '@/stores/extractionStore';
import { FieldTag } from './FieldTag';
import { FieldEditModal } from './FieldEditModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export function FieldTagsArea() {
  const { fields, removeField, reorderFields } = useExtractionStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<ExtractionField | null>(null);

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to activate drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms long-press required on touch devices
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleAddField = () => {
    setEditingField(null);
    setIsModalOpen(true);
  };

  const handleEditField = (field: ExtractionField) => {
    setEditingField(field);
    setIsModalOpen(true);
  };

  const handleDeleteField = (fieldId: string) => {
    // TODO: Add confirmation dialog in Story 3.4
    removeField(fieldId);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return; // No reordering needed
    }

    const oldIndex = fields.findIndex((field) => field.id === active.id);
    const newIndex = fields.findIndex((field) => field.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return; // Invalid indices
    }

    // Create new array with reordered fields
    const reorderedFields = [...fields];
    const [movedField] = reorderedFields.splice(oldIndex, 1);
    reorderedFields.splice(newIndex, 0, movedField);

    // Update store with new order
    reorderFields(reorderedFields);
  };

  return (
    <div className="space-y-3">
      {/* Field Tags Display */}
      {fields.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-wrap gap-1 min-h-[2rem]">
              {fields.map((field) => (
                <FieldTag
                  key={field.id}
                  field={field}
                  onEdit={handleEditField}
                  onDelete={handleDeleteField}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Field Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed border-2 text-gray-600 hover:text-gray-900 hover:border-gray-400"
        onClick={handleAddField}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Field
      </Button>

      {/* Field Edit Modal */}
      <FieldEditModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        field={editingField}
      />
    </div>
  );
}
