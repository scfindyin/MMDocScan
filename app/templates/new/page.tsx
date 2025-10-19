"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { TemplateType, FieldType } from "@/types/template";

/**
 * Template Builder Page - Manual Field Definition
 * Story 1.5: Manual Template Builder - Field Definition
 *
 * Allows users to create templates by manually defining fields
 * without AI assistance.
 */

// Local interface for field definition in form state
interface FieldDefinition {
  id: string; // Unique ID for React keys
  name: string;
  type: FieldType;
  category: "header" | "detail";
}

// Template type options for dropdown
const TEMPLATE_TYPES = [
  { value: TemplateType.INVOICE, label: "Invoice" },
  { value: TemplateType.ESTIMATE, label: "Estimate" },
  { value: TemplateType.EQUIPMENT_LOG, label: "Equipment Log" },
  { value: TemplateType.TIMESHEET, label: "Timesheet" },
  { value: TemplateType.CONSUMABLE_LOG, label: "Consumable Log" },
  { value: TemplateType.GENERIC, label: "Generic Document" },
];

// Data type options for field type selector
const DATA_TYPES = [
  { value: FieldType.TEXT, label: "Text" },
  { value: FieldType.NUMBER, label: "Number" },
  { value: FieldType.DATE, label: "Date" },
  { value: FieldType.CURRENCY, label: "Currency" },
];

export default function NewTemplatePage() {
  const router = useRouter();

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>(
    TemplateType.INVOICE
  );
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Add new field to array
  const addField = () => {
    const newField: FieldDefinition = {
      id: crypto.randomUUID(),
      name: "",
      type: FieldType.TEXT,
      category: "header",
    };
    setFields([...fields, newField]);
  };

  // Remove field by ID
  const removeField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  // Move field up in order
  const moveFieldUp = (index: number) => {
    if (index === 0) return; // Can't move first field up
    const newFields = [...fields];
    [newFields[index], newFields[index - 1]] = [
      newFields[index - 1],
      newFields[index],
    ];
    setFields(newFields);
  };

  // Move field down in order
  const moveFieldDown = (index: number) => {
    if (index === fields.length - 1) return; // Can't move last field down
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [
      newFields[index + 1],
      newFields[index],
    ];
    setFields(newFields);
  };

  // Update field property
  const updateField = (
    id: string,
    property: keyof FieldDefinition,
    value: string
  ) => {
    setFields(
      fields.map((f) => (f.id === id ? { ...f, [property]: value } : f))
    );
  };

  // Validate form before submission
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Template name required
    if (!templateName.trim()) {
      newErrors.templateName = "Template name is required";
    } else if (templateName.length > 255) {
      newErrors.templateName = "Template name must be 255 characters or less";
    }

    // At least 1 field required
    if (fields.length === 0) {
      newErrors.fields = "At least one field is required";
    }

    // Each field must have a name
    fields.forEach((field, index) => {
      if (!field.name.trim()) {
        newErrors[`field_${field.id}`] = "Field name is required";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save template
  const handleSave = async () => {
    // Clear previous messages
    setSuccessMessage("");

    // Validate form
    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      // Transform fields to API format
      const apiFields = fields.map((field, index) => ({
        field_name: field.name,
        field_type: field.type,
        is_header: field.category === "header",
        display_order: index,
      }));

      // Build request payload
      const payload = {
        name: templateName,
        template_type: templateType,
        fields: apiFields,
      };

      // Call API
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save template");
      }

      // Success - show message and redirect
      setSuccessMessage("Template created successfully!");
      setTimeout(() => {
        router.push("/templates");
      }, 1000);
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "An error occurred while saving the template",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel - return to template list
  const handleCancel = () => {
    router.push("/templates");
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      {/* Header with Back Button */}
      <Button
        variant="ghost"
        onClick={handleCancel}
        className="mb-6"
        disabled={isLoading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Templates
      </Button>

      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Template</h1>
        <p className="text-muted-foreground">
          Define your template fields manually
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
          {successMessage}
        </div>
      )}

      {/* Template Name and Type */}
      <div className="space-y-6 mb-8">
        {/* Template Name */}
        <div className="space-y-2">
          <Label htmlFor="templateName">
            Template Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="templateName"
            placeholder="Enter template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            disabled={isLoading}
            className={errors.templateName ? "border-red-500" : ""}
          />
          {errors.templateName && (
            <p className="text-sm text-red-500">{errors.templateName}</p>
          )}
        </div>

        {/* Template Type */}
        <div className="space-y-2">
          <Label htmlFor="templateType">
            Template Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={templateType}
            onValueChange={(value) => setTemplateType(value as TemplateType)}
            disabled={isLoading}
          >
            <SelectTrigger id="templateType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fields Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">
              Fields <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Define the fields to extract from documents
            </p>
          </div>
          <Button
            onClick={addField}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
        </div>

        {errors.fields && (
          <p className="text-sm text-red-500 mb-4">{errors.fields}</p>
        )}

        {/* Field List */}
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="border rounded-lg p-4 bg-card space-y-4"
            >
              {/* Field Header with Reorder and Remove Buttons */}
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Field {index + 1}
                </h3>
                <div className="flex gap-2">
                  {/* Move Up Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveFieldUp(index)}
                    disabled={index === 0 || isLoading}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>

                  {/* Move Down Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveFieldDown(index)}
                    disabled={index === fields.length - 1 || isLoading}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeField(field.id)}
                    disabled={isLoading}
                    title="Remove field"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Field Name Input */}
              <div className="space-y-2">
                <Label htmlFor={`field-name-${field.id}`}>
                  Field Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`field-name-${field.id}`}
                  placeholder="e.g., Invoice Number, Total Amount"
                  value={field.name}
                  onChange={(e) => updateField(field.id, "name", e.target.value)}
                  disabled={isLoading}
                  className={errors[`field_${field.id}`] ? "border-red-500" : ""}
                />
                {errors[`field_${field.id}`] && (
                  <p className="text-sm text-red-500">
                    {errors[`field_${field.id}`]}
                  </p>
                )}
              </div>

              {/* Field Type and Category Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data Type Selector */}
                <div className="space-y-2">
                  <Label htmlFor={`field-type-${field.id}`}>Data Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value) =>
                      updateField(field.id, "type", value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger id={`field-type-${field.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Radio Buttons */}
                <div className="space-y-2">
                  <Label>Category</Label>
                  <RadioGroup
                    value={field.category}
                    onValueChange={(value) =>
                      updateField(field.id, "category", value)
                    }
                    disabled={isLoading}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="header"
                        id={`${field.id}-header`}
                      />
                      <Label
                        htmlFor={`${field.id}-header`}
                        className="font-normal cursor-pointer"
                      >
                        Header
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="detail"
                        id={`${field.id}-detail`}
                      />
                      <Label
                        htmlFor={`${field.id}-detail`}
                        className="font-normal cursor-pointer"
                      >
                        Detail
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {fields.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <p className="mb-2">No fields defined yet</p>
              <p className="text-sm">
                Click &quot;Add Field&quot; to start defining your template fields
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {errors.submit}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Save Template"}
        </Button>
      </div>
    </div>
  );
}
