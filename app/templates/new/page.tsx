"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Upload, X, FileText, Sparkles, Loader2 } from "lucide-react";
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

// Suggested field from Claude API
interface SuggestedField {
  field_name: string;
  field_type: "text" | "number" | "date" | "currency";
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

  // File upload state (Story 1.6)
  const [sampleDocument, setSampleDocument] = useState<File | null>(null);
  const [skipSampleUpload, setSkipSampleUpload] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // AI field suggestion state (Story 1.7)
  const [analysisGuidance, setAnalysisGuidance] = useState("");
  const [suggestedFields, setSuggestedFields] = useState<SuggestedField[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  // Validate uploaded file
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return "File type not supported. Please upload PDF, Word (.doc, .docx), or text file.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit. File size: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    }

    if (file.size === 0) {
      return "File is empty. Please upload a valid document.";
    }

    return null; // Valid file
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Configure react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "text/plain": [".txt"],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0].code === "file-too-large") {
          setUploadError(`File size exceeds 10MB limit. File size: ${(rejection.file.size / 1024 / 1024).toFixed(1)}MB`);
        } else if (rejection.errors[0].code === "file-invalid-type") {
          setUploadError("File type not supported. Please upload PDF, Word (.doc, .docx), or text file.");
        } else {
          setUploadError(rejection.errors[0].message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const validationError = validateFile(file);

        if (validationError) {
          setUploadError(validationError);
          return;
        }

        setSampleDocument(file);
        setUploadError(null);
      }
    },
  });

  // Remove uploaded file
  const removeFile = () => {
    setSampleDocument(null);
    setUploadError(null);
  };

  // Handle skip upload
  const handleSkip = () => {
    setSkipSampleUpload(true);
    setSampleDocument(null);
    setUploadError(null);
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Get AI field suggestions
  const handleGetFieldSuggestions = async () => {
    if (!sampleDocument) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Convert File to base64
      const base64Document = await fileToBase64(sampleDocument);

      // Call API
      const response = await fetch("/api/extract/suggest-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          base64Document,
          documentType: sampleDocument.type,
          guidancePrompt: analysisGuidance.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze document");
      }

      const data = await response.json();
      setSuggestedFields(data.suggestedFields || []);
      setSelectedSuggestions(new Set()); // Reset selections
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Unable to analyze document. Please try again or define fields manually."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle suggestion selection
  const toggleSuggestion = (index: number) => {
    const newSelections = new Set(selectedSuggestions);
    if (newSelections.has(index)) {
      newSelections.delete(index);
    } else {
      newSelections.add(index);
    }
    setSelectedSuggestions(newSelections);
  };

  // Select all suggestions
  const selectAllSuggestions = () => {
    setSelectedSuggestions(new Set(suggestedFields.map((_, i) => i)));
  };

  // Deselect all suggestions
  const deselectAllSuggestions = () => {
    setSelectedSuggestions(new Set());
  };

  // Add selected suggestions to fields
  const handleAddSelectedFields = () => {
    const newFields: FieldDefinition[] = suggestedFields
      .filter((_, index) => selectedSuggestions.has(index))
      .map((sf) => ({
        id: crypto.randomUUID(),
        name: sf.field_name,
        type: sf.field_type as FieldType,
        category: sf.category,
      }));

    // Append to existing fields (don't overwrite)
    setFields([...fields, ...newFields]);

    // Clear suggestions
    setSuggestedFields([]);
    setSelectedSuggestions(new Set());
    setAnalysisGuidance("");
  };

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

      {/* Sample Document Upload Section (Optional) - Story 1.6 */}
      {!skipSampleUpload && (
        <div className="mb-8 border rounded-lg p-6 bg-card">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">
              Upload Sample Document{" "}
              <span className="text-sm font-normal text-muted-foreground">
                (Optional)
              </span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Upload a sample document to enable AI field suggestions (Story 1.7) and test extraction (Story 1.9)
            </p>
          </div>

          {!sampleDocument ? (
            <>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${
                    isDragActive
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
                  }
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop file here...</p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">
                      Drag file here or click to browse
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Accepts PDF, Word (.doc, .docx), and text files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Maximum file size: 10MB
                    </p>
                  </>
                )}
              </div>

              {/* Upload Error */}
              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  {uploadError}
                </div>
              )}

              {/* Skip Button */}
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isLoading}
                  type="button"
                >
                  Skip - Define Fields Manually
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Uploaded File Info */}
              <div className="border rounded-lg p-4 bg-background">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-10 w-10 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {sampleDocument.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Type: {sampleDocument.type || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Size: {formatFileSize(sampleDocument.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    disabled={isLoading}
                    title="Remove file"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Success Message */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-full" />
                </div>
                File uploaded successfully
              </div>
            </>
          )}
        </div>
      )}

      {/* AI Field Suggestions Section (Story 1.7) */}
      {sampleDocument && (
        <div className="mb-8 border rounded-lg p-6 bg-card">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Field Suggestions
            </h2>
            <p className="text-sm text-muted-foreground">
              Let AI analyze your document and suggest extractable fields
            </p>
          </div>

          {/* Analysis Guidance Textarea */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="analysisGuidance">
              Help AI Understand Your Document{" "}
              <span className="text-sm font-normal text-muted-foreground">
                (Optional)
              </span>
            </Label>
            <p className="text-sm text-muted-foreground">
              Provide context to help AI better understand your document structure (e.g., &quot;Line items are in a table on page 2&quot;)
            </p>
            <Textarea
              id="analysisGuidance"
              placeholder="e.g., 'This is an invoice. Line items are in a table on page 2. Dates are in MM/DD/YYYY format.'"
              value={analysisGuidance}
              onChange={(e) => setAnalysisGuidance(e.target.value)}
              rows={2}
              className="min-h-[60px]"
              disabled={isAnalyzing || isLoading}
            />
          </div>

          {/* Get AI Field Suggestions Button */}
          <Button
            onClick={handleGetFieldSuggestions}
            disabled={isAnalyzing || isLoading}
            className="w-full sm:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Get AI Field Suggestions
              </>
            )}
          </Button>

          {/* Analysis Error */}
          {analysisError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {analysisError}
            </div>
          )}

          {/* Suggested Fields Display */}
          {suggestedFields.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {suggestedFields.length} field{suggestedFields.length !== 1 ? "s" : ""} suggested
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllSuggestions}
                    disabled={isLoading}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllSuggestions}
                    disabled={isLoading}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>

              {/* Suggested Fields List */}
              <div className="border rounded-lg divide-y">
                {suggestedFields.map((field, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-accent/50 transition-colors flex items-center gap-3"
                  >
                    <Checkbox
                      checked={selectedSuggestions.has(index)}
                      onCheckedChange={() => toggleSuggestion(index)}
                      disabled={isLoading}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{field.field_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Type: <span className="capitalize">{field.field_type}</span> • Category:{" "}
                        <span className="capitalize">{field.category}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Selected Fields Button */}
              <Button
                onClick={handleAddSelectedFields}
                disabled={selectedSuggestions.size === 0 || isLoading}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Selected Fields ({selectedSuggestions.size})
              </Button>
            </div>
          )}
        </div>
      )}

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
