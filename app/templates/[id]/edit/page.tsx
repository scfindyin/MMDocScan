"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Upload, X, FileText, Sparkles, Loader2, ChevronDown, CheckCircle, AlertCircle } from "lucide-react";
import { TemplateType, FieldType } from "@/types/template";
import { ExtractedRow } from "@/types/extraction";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Edit Template Page
 * Story 1.10: Save Validated Template - Edit Mode
 *
 * Allows users to edit existing templates with same workflow as creation
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

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const templateId = params?.id as string;

  // Loading state
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>(
    TemplateType.INVOICE
  );
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

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

  // Custom prompt state (Story 1.8)
  const [customPrompt, setCustomPrompt] = useState("");
  const [promptTipsOpen, setPromptTipsOpen] = useState(false);

  // Test extraction state (Story 1.9)
  const [testResults, setTestResults] = useState<ExtractedRow[] | null>(null);
  const [isTestingExtraction, setIsTestingExtraction] = useState(false);
  const [testExtractionError, setTestExtractionError] = useState<string | null>(null);

  // Delete confirmation state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ACCEPTED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  // Load template data on mount (AC#6)
  useEffect(() => {
    const loadTemplate = async () => {
      if (!templateId) {
        setLoadError("Template ID not provided");
        setIsLoadingTemplate(false);
        return;
      }

      try {
        const response = await fetch(`/api/templates/${templateId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Template not found. It may have been deleted.");
          }
          throw new Error("Failed to load template");
        }

        const data = await response.json();

        // Populate form with template data
        setTemplateName(data.template.name);
        setTemplateType(data.template.template_type as TemplateType);

        // Transform fields from database format to UI format
        const transformedFields: FieldDefinition[] = data.fields.map((f: any) => ({
          id: crypto.randomUUID(),
          name: f.field_name,
          type: f.field_type as FieldType,
          category: f.is_header ? "header" : "detail",
        }));
        setFields(transformedFields);

        // Load custom prompt if exists
        const customPromptData = data.prompts?.find((p: any) => p.prompt_type === "custom");
        if (customPromptData) {
          setCustomPrompt(customPromptData.prompt_text);
        }

      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Failed to load template"
        );
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadTemplate();
  }, [templateId]);

  // Redirect if template not found
  useEffect(() => {
    if (loadError && loadError.includes("not found")) {
      toast({
        title: "Error",
        description: loadError,
        variant: "destructive",
      });
      setTimeout(() => {
        router.push("/templates");
      }, 2000);
    }
  }, [loadError, router, toast]);

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

  // Test extraction handler (Story 1.9)
  const handleTestExtraction = async () => {
    if (!sampleDocument || fields.length === 0) return;

    setIsTestingExtraction(true);
    setTestExtractionError(null);

    try {
      // Convert File to base64
      const base64Document = await fileToBase64(sampleDocument);

      // Prepare template fields in API format
      const templateFields = fields.map((f) => ({
        field_name: f.name,
        field_type: f.type,
        is_header: f.category === "header",
      }));

      // Call test extraction API
      const response = await fetch("/api/extract/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentBase64: base64Document,
          templateFields,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Extraction failed");
      }

      // Store results
      setTestResults(data.data);

      // Smooth scroll to results
      setTimeout(() => {
        const resultsElement = document.getElementById("test-results");
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } catch (error) {
      setTestExtractionError(
        error instanceof Error
          ? error.message
          : "Unable to extract data. Please try again."
      );
    } finally {
      setIsTestingExtraction(false);
    }
  };

  // Format cell value by data type
  const formatCellValue = (value: any, fieldType: string): string => {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    switch (fieldType) {
      case "currency":
        const numValue = typeof value === "number" ? value : parseFloat(value);
        return isNaN(numValue) ? value : `$${numValue.toFixed(2)}`;
      case "date":
        return value; // Already formatted by API or keep as-is
      case "number":
        return value.toString();
      case "text":
      default:
        return value.toString();
    }
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

  // Handle save template (AC#7: PUT instead of POST, different success message)
  const handleSave = async () => {
    // Clear previous errors
    setErrors({});

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

      // Build prompts array if custom prompt is provided (Story 1.8)
      const prompts = customPrompt.trim()
        ? [
            {
              prompt_text: customPrompt.trim(),
              prompt_type: "custom",
            },
          ]
        : undefined;

      // Build request payload
      const payload = {
        name: templateName,
        template_type: templateType,
        fields: apiFields,
        ...(prompts && { prompts }),
      };

      // Call API with PUT method (AC#7)
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update template");
      }

      // Success - show toast notification with "updated" message (AC#7)
      toast({
        title: "Success",
        description: `Template '${templateName}' updated successfully`,
      });

      // Redirect to template list after 1 second delay (AC#5)
      setTimeout(() => {
        router.push("/templates");
      }, 1000);
    } catch (error) {
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "An error occurred while updating the template",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel - return to template list
  const handleCancel = () => {
    router.push("/templates");
  };

  // Handle delete template
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete template");
      }

      // Success - show toast notification
      toast({
        title: "Success",
        description: `Template '${templateName}' deleted successfully`,
      });

      // Redirect to template list
      router.push("/templates");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      });
      setShowDeleteDialog(false);
      setIsDeleting(false);
    }
  };

  // Show loading state while template loads
  if (isLoadingTemplate) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if template failed to load
  if (loadError && !loadError.includes("not found")) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl">
        <Button variant="ghost" onClick={() => router.push("/templates")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {loadError}
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => router.push("/templates")}
            >
              Return to Templates
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main edit form (same as new template but with pre-populated data)
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

      {/* Page Title (AC#7: Shows "Edit Template") */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Edit Template</h1>
        <p className="text-muted-foreground">
          Modify template fields and settings
        </p>
      </div>

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
              Upload a sample document to enable AI field suggestions and test extraction
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
                  Skip - Edit Fields Manually
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
              Provide context to help AI better understand your document structure
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

      {/* Custom AI Prompts Section (Story 1.8) */}
      <div className="mb-8 border rounded-lg p-6 bg-card">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">
            Custom AI Prompts{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Optional)
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Add custom instructions to guide AI extraction for this template
          </p>
        </div>

        {/* Custom Prompt Textarea */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="customPrompt">
            Custom Extraction Instructions{" "}
            <span className="text-sm font-normal text-muted-foreground">
              (Optional)
            </span>
          </Label>
          <Textarea
            id="customPrompt"
            placeholder="Extract all line items as separate rows. Format dates as YYYY-MM-DD."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={7}
            className="min-h-[140px]"
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            {customPrompt.length} characters
          </p>
        </div>

        {/* Prompt Tips Collapsible Section */}
        <Collapsible open={promptTipsOpen} onOpenChange={setPromptTipsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 w-full justify-start p-0 h-auto font-normal text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  promptTipsOpen ? "rotate-180" : ""
                }`}
              />
              Prompt Tips - How to write effective extraction prompts
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-3 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Be specific about formats
              </h4>
              <p>
                Example: &quot;Format all dates as YYYY-MM-DD&quot; or &quot;Round
                currency values to 2 decimal places&quot;
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Describe line item handling
              </h4>
              <p>
                Example: &quot;Extract each line item as a separate row&quot; or
                &quot;Combine multi-line descriptions into single cell&quot;
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Clarify header vs detail fields
              </h4>
              <p>
                Example: &quot;Repeat invoice number and date on each line
                item&quot; or &quot;Header fields should appear once at the
                top&quot;
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Reference field names from your template
              </h4>
              <p>
                Example: &quot;Extract &apos;quantity&apos; as integer, &apos;unit_price&apos; as
                decimal with 2 places&quot;
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">
                Provide examples for complex cases
              </h4>
              <p>
                Example: &quot;If total includes tax, extract both &apos;subtotal&apos;
                and &apos;tax_amount&apos; separately&quot;
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Test Extraction Button (Story 1.9) */}
        <div className="mt-6 pt-6 border-t">
          <Button
            onClick={handleTestExtraction}
            disabled={!sampleDocument || fields.length === 0 || isTestingExtraction}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isTestingExtraction ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing extraction...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Test Extraction
              </>
            )}
          </Button>
          {!sampleDocument && fields.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Upload a sample document to test extraction
            </p>
          )}
          {sampleDocument && fields.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Define at least one field to test extraction
            </p>
          )}
        </div>
      </div>

      {/* Test Extraction Error (Story 1.9) */}
      {testExtractionError && (
        <div className="mb-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              {testExtractionError}
              <Button
                variant="outline"
                size="sm"
                className="ml-4"
                onClick={handleTestExtraction}
                disabled={isTestingExtraction}
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Test Results Preview (Story 1.9) */}
      {testResults !== null && (
        <div id="test-results" className="mb-8 border rounded-lg p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Test Results
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {testResults.length} {testResults.length === 1 ? "row" : "rows"} extracted
                {testResults.length > 0 && (
                  <>
                    {" · "}
                    {testResults.filter((r) => r.confidence >= 0.7).length} high confidence,{" "}
                    {testResults.filter((r) => r.confidence < 0.7).length} low confidence
                  </>
                )}
              </p>
            </div>
            <Button
              onClick={handleTestExtraction}
              disabled={isTestingExtraction}
              variant="outline"
              size="sm"
            >
              {isTestingExtraction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Re-testing...
                </>
              ) : (
                "Re-test"
              )}
            </Button>
          </div>

          {testResults.length === 0 ? (
            <Alert>
              <AlertDescription>
                No data extracted. Try adjusting your custom prompt or check the sample document content.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map((field) => (
                      <TableHead key={field.id}>{field.name}</TableHead>
                    ))}
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.map((row) => (
                    <TableRow
                      key={row.rowId}
                      className={row.confidence < 0.7 ? "bg-yellow-50" : ""}
                    >
                      {fields.map((field) => (
                        <TableCell key={field.id}>
                          {formatCellValue(row.fields[field.name], field.type)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <span
                          className={
                            row.confidence < 0.7
                              ? "text-orange-600 font-medium"
                              : "text-green-600"
                          }
                          title={
                            row.confidence < 0.7
                              ? "Low confidence - may require manual review"
                              : "High confidence"
                          }
                        >
                          {(row.confidence * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            <strong>What do confidence scores mean?</strong> Scores reflect how complete and accurate the extracted data is.
            Low confidence rows (below 70%) are highlighted in yellow and may need manual review.
          </p>
        </div>
      )}

      {/* Submit Error */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {errors.submit}
        </div>
      )}

      {/* Action Buttons (AC#7: Save enabled immediately in edit mode, no test required) */}
      <div className="flex gap-4 justify-between">
        {/* Delete Button - Left Side */}
        <Button
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isLoading || isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Template
        </Button>

        {/* Save/Cancel Buttons - Right Side */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || isDeleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isDeleting}
          >
            {isLoading ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{templateName}&quot;? This action cannot be undone.
              All associated fields and prompts will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Template"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
