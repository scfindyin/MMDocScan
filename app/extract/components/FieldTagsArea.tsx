'use client';

import { useState } from 'react';
import { useExtractionStore, type ExtractionField } from '@/stores/extractionStore';
import { FieldTag } from './FieldTag';
import { FieldEditModal } from './FieldEditModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function FieldTagsArea() {
  const { fields, removeField } = useExtractionStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<ExtractionField | null>(null);

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

  return (
    <div className="space-y-3">
      {/* Field Tags Display */}
      {fields.length > 0 && (
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
