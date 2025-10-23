"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, File as FileIcon, X, ArrowRight, CheckCircle2, Eye, PlayCircle, AlertCircle } from "lucide-react";
import type { TemplateListItem, TemplateField, TemplatePrompt } from "@/types/template";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProcessDocumentsPage() {
  // Multi-step workflow state
  const [step, setStep] = useState<'upload' | 'select-template'>('upload');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Template selection state
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{
    name: string;
    type: string;
    fields: TemplateField[];
    prompts: TemplatePrompt[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch templates when step changes to 'select-template'
  useEffect(() => {
    if (step === 'select-template') {
      fetchTemplates();
    }
  }, [step]);

  // Fetch templates from API
  const fetchTemplates = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const response = await fetch('/api/templates');

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      setFetchError(errorMessage);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

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
      return "Unsupported file type. Please upload PDF, Word, or Text files.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File exceeds 10MB limit. Please upload a smaller file. (Current size: ${(file.size / 1024 / 1024).toFixed(1)} MB)`;
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

  // Get file type display string
  const getFileType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toUpperCase();
    return extension || 'Unknown';
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    if (file.type.includes("word")) {
      return <FileText className="h-8 w-8 text-blue-500" />;
    }
    return <FileIcon className="h-8 w-8 text-gray-500" />;
  };

  // Format template type for display
  const formatTemplateType = (type: string): string => {
    const typeMap: Record<string, string> = {
      invoice: 'Invoice',
      estimate: 'Estimate',
      equipment_log: 'Equipment Log',
      timesheet: 'Timesheet',
      consumable_log: 'Consumable Log',
      generic: 'Generic',
    };
    return typeMap[type] || type;
  };

  // Get template type badge color
  const getTypeBadgeColor = (type: string): string => {
    const colorMap: Record<string, string> = {
      invoice: 'bg-purple-100 text-purple-700',
      estimate: 'bg-blue-100 text-blue-700',
      equipment_log: 'bg-green-100 text-green-700',
      timesheet: 'bg-yellow-100 text-yellow-700',
      consumable_log: 'bg-orange-100 text-orange-700',
      generic: 'bg-gray-100 text-gray-700',
    };
    return colorMap[type] || 'bg-gray-100 text-gray-700';
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
          setError(`File exceeds 10MB limit. Please upload a smaller file. (Current size: ${(rejection.file.size / 1024 / 1024).toFixed(1)} MB)`);
        } else if (rejection.errors[0].code === "file-invalid-type") {
          setError("Unsupported file type. Please upload PDF, Word, or Text files.");
        } else {
          setError(rejection.errors[0].message);
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const validationError = validateFile(file);

        if (validationError) {
          setError(validationError);
          return;
        }

        setUploadedFile(file);
        setError(null);
      }
    },
  });

  // Remove uploaded file
  const removeFile = () => {
    setUploadedFile(null);
    setError(null);
  };

  // Handle next button click
  const handleNext = () => {
    setStep('select-template');
  };

  // Handle back to upload
  const handleBackToUpload = () => {
    setStep('upload');
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  // Handle preview template
  const handlePreviewTemplate = async (templateId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card selection when clicking preview
    setPreviewLoading(true);
    setPreviewOpen(true);

    try {
      const response = await fetch(`/api/templates/${templateId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch template details');
      }

      const data = await response.json();
      setPreviewTemplate({
        name: data.template.name,
        type: data.template.template_type,
        fields: data.fields || [],
        prompts: data.prompts || [],
      });
    } catch (err) {
      console.error('Error fetching template details:', err);
      setPreviewTemplate(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle apply template and extract
  const handleApplyTemplate = () => {
    if (!selectedTemplateId || !uploadedFile) return;

    // TODO: Trigger extraction in Story 2.3
    console.log('Apply Template & Extract clicked');
    console.log('Selected Template ID:', selectedTemplateId);
    console.log('Uploaded File:', uploadedFile.name);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-blue-600">
          Process Production Documents
        </h1>
        <p className="text-muted-foreground">
          {step === 'upload'
            ? 'Upload documents to extract data using your saved templates'
            : 'Select a template to apply to your document'}
        </p>
      </div>

      {/* Conditional rendering based on step */}
      {step === 'upload' ? (
        <>
          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Upload or File Display */}
          {!uploadedFile ? (
        <div>
          {/* Drag-and-Drop Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragActive
                ? "Drop your document here"
                : "Drag and drop your document here"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Supported formats: PDF, Word (.doc, .docx), Text (.txt)</p>
              <p>Maximum file size: 10MB</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Uploaded File Display */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getFileIcon(uploadedFile)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg mb-1 truncate">
                    {uploadedFile.name}
                  </h3>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{getFileType(uploadedFile)}</span>
                    <span>•</span>
                    <span>{formatFileSize(uploadedFile.size)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>File uploaded successfully</span>
                  </div>
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeFile}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Next Button */}
          <div className="mt-6">
            <Button
              onClick={handleNext}
              disabled={!uploadedFile}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              Next: Select Template
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
        </>
      ) : (
        <div>
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToUpload}
            >
              Back to Document Upload
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <p className="text-muted-foreground mb-4">Loading templates...</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <Skeleton className="h-4 w-1/4 mb-2" />
                      <Skeleton className="h-3 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && fetchError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p>{fetchError}</p>
                  <Button
                    onClick={fetchTemplates}
                    variant="outline"
                  >
                    Retry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State */}
          {!loading && !fetchError && templates.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-4">
                  <p>No templates found. Create a template first to process documents.</p>
                  <Button
                    onClick={() => window.location.href = '/templates/new'}
                    variant="default"
                  >
                    Create Template
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Template List */}
          {!loading && !fetchError && templates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => {
                const isSelected = selectedTemplateId === template.id;
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 border-2 bg-blue-50'
                        : 'hover:border-blue-400 border-2 border-transparent'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="p-6 relative">
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-4 right-4">
                          <CheckCircle2 className="h-6 w-6 text-blue-600" />
                        </div>
                      )}

                      {/* Template Name */}
                      <h3 className="font-semibold text-lg mb-2 pr-8">
                        {template.name}
                      </h3>

                      {/* Template Type Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(template.template_type)}`}>
                          {formatTemplateType(template.template_type)}
                        </span>
                        {isSelected && (
                          <span className="text-xs font-medium text-blue-600">
                            Selected
                          </span>
                        )}
                      </div>

                      {/* Field Count */}
                      <p className="text-sm text-muted-foreground">
                        {template.field_count || 0} fields
                      </p>

                      {/* Last Used Date - Placeholder */}
                      <p className="text-xs text-muted-foreground mt-2">
                        Last used: Not available
                      </p>

                      {/* Preview Button */}
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handlePreviewTemplate(template.id, e)}
                          className="w-full"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Preview Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Apply Template Button */}
          {!loading && !fetchError && templates.length > 0 && (
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Apply Template & Extract
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewTemplate?.name || 'Template Preview'}
            </DialogTitle>
            <DialogDescription>
              {previewTemplate && `${formatTemplateType(previewTemplate.type)} Template`}
            </DialogDescription>
          </DialogHeader>

          {previewLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading template details...
            </div>
          ) : previewTemplate ? (
            <div className="space-y-6">
              {/* Fields Section */}
              <div>
                <h3 className="font-semibold mb-3">Fields ({previewTemplate.fields.length})</h3>
                {previewTemplate.fields.length > 0 ? (
                  <div className="space-y-2">
                    {previewTemplate.fields
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{field.field_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {field.field_type} • {field.is_header ? 'Header' : 'Detail'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No fields defined</p>
                )}
              </div>

              {/* Prompts Section */}
              <div>
                <h3 className="font-semibold mb-3">Custom Prompts</h3>
                {previewTemplate.prompts.length > 0 ? (
                  <div className="space-y-3">
                    {previewTemplate.prompts.map((prompt) => (
                      <div key={prompt.id} className="p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {prompt.prompt_type.toUpperCase()}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{prompt.prompt_text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom prompts defined</p>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4">
                <Button onClick={() => setPreviewOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Failed to load template details
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
