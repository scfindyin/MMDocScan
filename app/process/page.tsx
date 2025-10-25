"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, File as FileIcon, X, ArrowRight, CheckCircle2, Eye, PlayCircle, AlertCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Info, FileSpreadsheet, RefreshCw } from "lucide-react";
import type { Template, TemplateField } from "@/types/template";
import type { ExtractedRow } from "@/types/extraction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { generateExcelFile } from "@/lib/excel/export";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProcessDocumentsPage() {
  // Multi-step workflow state
  const [step, setStep] = useState<'upload' | 'select-template' | 'extracting' | 'results'>('upload');

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Template selection state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Preview dialog state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<{
    name: string;
    fields: TemplateField[];
    extraction_prompt: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Extraction state
  const [extractedData, setExtractedData] = useState<ExtractedRow[] | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionRetryable, setExtractionRetryable] = useState(false);

  // Results table state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showLowConfidenceOnly, setShowLowConfidenceOnly] = useState(false);
  const [selectedTemplateFields, setSelectedTemplateFields] = useState<TemplateField[]>([]);

  // Prompt refinement state
  const [isPromptPanelOpen, setIsPromptPanelOpen] = useState(false);
  const [promptOverride, setPromptOverride] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [isReExtracting, setIsReExtracting] = useState(false);

  // Template save dialogs
  const [showUpdateConfirmDialog, setShowUpdateConfirmDialog] = useState(false);
  const [showSaveAsNewDialog, setShowSaveAsNewDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Excel export state
  const [isExporting, setIsExporting] = useState(false);
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [customFilename, setCustomFilename] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);

  // Toast for placeholder buttons
  const { toast } = useToast();

  // Fetch templates when step changes to 'select-template'
  useEffect(() => {
    if (step === 'select-template') {
      fetchTemplates();
    }
  }, [step]);

  // Fetch selected template fields when results are ready
  useEffect(() => {
    if (step === 'results' && selectedTemplateId && selectedTemplateFields.length === 0) {
      fetchTemplateFields();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedTemplateId]);

  // Fetch template fields for table columns
  const fetchTemplateFields = async () => {
    if (!selectedTemplateId) return;

    try {
      const response = await fetch(`/api/templates/${selectedTemplateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      const data = await response.json();
      setSelectedTemplateFields(data.fields || []);

      // Load extraction_prompt for refinement feature (Epic 3: single prompt field)
      if (data.extraction_prompt) {
        setCurrentPrompt(data.extraction_prompt);
        setPromptOverride(data.extraction_prompt);
      } else {
        setCurrentPrompt('');
        setPromptOverride('');
      }
    } catch (err) {
      console.error('Error fetching template fields:', err);
    }
  };

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
      // Epic 3: API returns template object directly
      setPreviewTemplate({
        name: data.name,
        fields: data.fields || [],
        extraction_prompt: data.extraction_prompt || null,
      });
    } catch (err) {
      console.error('Error fetching template details:', err);
      setPreviewTemplate(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 data after the comma (remove data:...;base64, prefix)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle apply template and extract
  const handleApplyTemplate = async () => {
    if (!selectedTemplateId || !uploadedFile) return;

    setIsExtracting(true);
    setStep('extracting');
    setExtractionError(null);

    try {
      // Convert file to base64
      const base64Document = await fileToBase64(uploadedFile);

      // Call extraction API
      const response = await fetch('/api/extract/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentBase64: base64Document,
          templateId: selectedTemplateId,
          filename: uploadedFile.name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setExtractionError(data.error || 'Extraction failed. Please try again.');
        setExtractionRetryable(data.retryable !== false);
        setIsExtracting(false);
        return;
      }

      // Success: store extracted data and transition to results
      setExtractedData(data.data);
      setIsExtracting(false);
      setStep('results');
    } catch (error) {
      console.error('Extraction error:', error);
      setExtractionError('Network error. Please check connection and retry.');
      setExtractionRetryable(true);
      setIsExtracting(false);
    }
  };

  // Handle retry extraction
  const handleRetryExtraction = () => {
    setExtractionError(null);
    handleApplyTemplate();
  };

  // Handle cancel extraction (return to template selection)
  const handleCancelExtraction = () => {
    setStep('select-template');
    setExtractionError(null);
    setExtractionRetryable(false);
  };

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get field data type for sorting
  const getFieldType = (fieldName: string): string => {
    const field = selectedTemplateFields.find(f => f.name === fieldName);
    return 'text'; // Epic 3: All fields are text type
  };

  // Sort extracted data
  const getSortedData = (data: ExtractedRow[]): ExtractedRow[] => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Special columns
      if (sortColumn === 'confidence') {
        aVal = a.confidence;
        bVal = b.confidence;
      } else if (sortColumn === 'source') {
        aVal = a.sourceMetadata.filename;
        bVal = b.sourceMetadata.filename;
      } else if (sortColumn === 'page') {
        aVal = a.sourceMetadata.pageNumber || 0;
        bVal = b.sourceMetadata.pageNumber || 0;
      } else {
        // Field columns
        aVal = a.fields[sortColumn];
        bVal = b.fields[sortColumn];
      }

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Type-specific sorting
      const fieldType = sortColumn === 'confidence' || sortColumn === 'page' ? 'number' :
                        sortColumn === 'source' ? 'text' :
                        getFieldType(sortColumn);

      let comparison = 0;
      if (fieldType === 'number' || fieldType === 'currency') {
        const numA = typeof aVal === 'number' ? aVal : parseFloat(String(aVal).replace(/[^0-9.-]/g, ''));
        const numB = typeof bVal === 'number' ? bVal : parseFloat(String(bVal).replace(/[^0-9.-]/g, ''));
        comparison = numA - numB;
      } else if (fieldType === 'date') {
        const dateA = new Date(aVal).getTime();
        const dateB = new Date(bVal).getTime();
        comparison = dateA - dateB;
      } else {
        // Text sorting
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // Filter extracted data
  const getFilteredData = (data: ExtractedRow[]): ExtractedRow[] => {
    if (!showLowConfidenceOnly) return data;
    return data.filter(row => row.confidence < 0.7);
  };

  // Get processed data (filtered then sorted)
  const getProcessedData = (): ExtractedRow[] => {
    if (!extractedData) return [];
    const filtered = getFilteredData(extractedData);
    return getSortedData(filtered);
  };

  // Calculate row counts
  const getRowCounts = () => {
    if (!extractedData) return { total: 0, high: 0, low: 0, filtered: 0 };
    const total = extractedData.length;
    const low = extractedData.filter(row => row.confidence < 0.7).length;
    const high = total - low;
    const filtered = getProcessedData().length;
    return { total, high, low, filtered };
  };

  // Format confidence as percentage
  const formatConfidence = (confidence: number): string => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  // Format field value based on type
  const formatFieldValue = (value: any, fieldName: string): string => {
    if (value == null || value === '') return '—';

    const fieldType = getFieldType(fieldName);

    if (fieldType === 'currency') {
      const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? String(value) : `$${num.toFixed(2)}`;
    }

    if (fieldType === 'number') {
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? String(value) : num.toString();
    }

    if (fieldType === 'date') {
      try {
        const date = new Date(value);
        return date.toLocaleDateString();
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  // Truncate filename with tooltip
  const truncateFilename = (filename: string, maxLength: number = 30): string => {
    if (filename.length <= maxLength) return filename;
    return filename.substring(0, maxLength - 3) + '...';
  };

  // Handle process another document
  const handleProcessAnother = () => {
    setStep('upload');
    setUploadedFile(null);
    setSelectedTemplateId(null);
    setExtractedData(null);
    setSelectedTemplateFields([]);
    setSortColumn(null);
    setSortDirection('asc');
    setShowLowConfidenceOnly(false);
  };

  // Generate suggested filename for Excel export
  const generateFilename = async (): Promise<string> => {
    if (!uploadedFile) {
      return 'extraction_results.xlsx';
    }

    // Fetch template name if we have a selected template
    let templateName = 'extraction';
    if (selectedTemplateId) {
      try {
        const response = await fetch(`/api/templates/${selectedTemplateId}`);
        if (response.ok) {
          const data = await response.json();
          templateName = data.template.name || 'extraction';
        }
      } catch (error) {
        console.error('Failed to fetch template name for filename:', error);
      }
    }

    // Get document name without extension
    const documentName = uploadedFile.name.replace(/\.[^/.]+$/, '');

    // Get current date in YYYY-MM-DD format
    const date = new Date().toISOString().split('T')[0];

    // Sanitize: replace spaces with hyphens, remove special characters
    const sanitize = (str: string) =>
      str.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');

    return `${sanitize(templateName)}_${sanitize(documentName)}_${date}.xlsx`;
  };

  // Handle Export to Excel button click
  const handleExportExcel = async () => {
    if (!extractedData || extractedData.length === 0 || !selectedTemplateId) {
      toast({
        title: "Export Error",
        description: "No data available to export.",
        variant: "destructive",
      });
      return;
    }

    // Generate suggested filename and show dialog
    const suggested = await generateFilename();
    setCustomFilename(suggested);
    setShowFilenameDialog(true);
  };

  // Perform Excel export with chosen filename
  const performExcelExport = async (filename: string) => {
    if (!extractedData || !selectedTemplateId) return;

    setIsExporting(true);
    setExportError(null);

    try {
      // Fetch full template data (we only have ID in state)
      const response = await fetch(`/api/templates/${selectedTemplateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch template data for export');
      }
      const templateData = await response.json();

      // Call generateExcelFile from Story 2.7
      const buffer = await generateExcelFile(extractedData, {
        ...templateData.template,
        fields: templateData.fields,
        prompts: templateData.prompts,
      });

      // Convert Buffer to Blob for browser download
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      // Create blob URL and trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Close dialog and show success message
      setShowFilenameDialog(false);
      setIsExporting(false);

      toast({
        title: "Excel file downloaded successfully",
        description: `${extractedData.length} rows exported to ${filename}`,
      });
    } catch (error) {
      console.error('Excel export error:', error);
      setIsExporting(false);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to generate Excel file';

      setExportError(errorMessage);
      toast({
        title: "Export Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Handle filename dialog confirm
  const handleFilenameConfirm = () => {
    if (!customFilename.trim()) {
      toast({
        title: "Validation Error",
        description: "Filename cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Ensure .xlsx extension
    let filename = customFilename.trim();
    if (!filename.toLowerCase().endsWith('.xlsx')) {
      filename += '.xlsx';
    }

    performExcelExport(filename);
  };

  // Handle quick export with suggested filename
  const handleQuickExport = async () => {
    const filename = await generateFilename();
    setShowFilenameDialog(false);
    performExcelExport(filename);
  };

  // Handle adjust prompts button click
  const handleAdjustPrompts = () => {
    setIsPromptPanelOpen(!isPromptPanelOpen);
  };

  // Handle re-extraction with updated prompt
  const handleReExtract = async () => {
    if (!selectedTemplateId || !uploadedFile) return;

    // Validate prompt is not empty
    if (!promptOverride.trim()) {
      toast({
        title: "Validation Error",
        description: "Prompt cannot be empty. Please enter extraction instructions.",
        variant: "destructive",
      });
      return;
    }

    setIsReExtracting(true);
    setExtractionError(null);

    try {
      // Convert file to base64
      const base64Document = await fileToBase64(uploadedFile);

      // Call extraction API with prompt override
      const response = await fetch('/api/extract/production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentBase64: base64Document,
          templateId: selectedTemplateId,
          customPrompt: promptOverride, // Send updated prompt
          filename: uploadedFile.name,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setExtractionError(data.error || 'Re-extraction failed. Please try again.');
        setExtractionRetryable(data.retryable !== false);
        setIsReExtracting(false);
        toast({
          title: "Re-extraction Failed",
          description: data.error || 'Failed to re-extract with updated prompt.',
          variant: "destructive",
        });
        return;
      }

      // Success: update extracted data
      setExtractedData(data.data);
      setIsReExtracting(false);
      setIsPromptPanelOpen(false); // Close panel on success
      toast({
        title: "Re-extraction Complete",
        description: `Successfully extracted ${data.data.length} rows with updated prompt.`,
      });
    } catch (error) {
      console.error('Re-extraction error:', error);
      setExtractionError('Network error. Please check connection and retry.');
      setExtractionRetryable(true);
      setIsReExtracting(false);
      toast({
        title: "Network Error",
        description: "Failed to connect to server. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  // Handle update original template with refined prompts
  const handleUpdateTemplate = async () => {
    if (!selectedTemplateId) return;

    setIsSavingTemplate(true);

    try {
      // Fetch current template data
      const getResponse = await fetch(`/api/templates/${selectedTemplateId}`);
      if (!getResponse.ok) {
        throw new Error('Failed to fetch template');
      }
      const templateData = await getResponse.json();

      // Update template with new prompt
      const updateResponse = await fetch(`/api/templates/${selectedTemplateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateData.template.name,
          fields: templateData.fields,
          extraction_prompt: promptOverride || null,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update template');
      }

      // Update current prompt to match new saved value
      setCurrentPrompt(promptOverride);
      setIsSavingTemplate(false);
      setShowUpdateConfirmDialog(false);
      toast({
        title: "Template Updated",
        description: "Refined prompts saved to original template successfully.",
      });
    } catch (error) {
      console.error('Template update error:', error);
      setIsSavingTemplate(false);
      toast({
        title: "Update Failed",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle save as new template
  const handleSaveAsNewTemplate = async () => {
    if (!selectedTemplateId || !newTemplateName.trim()) return;

    setIsSavingTemplate(true);

    try {
      // Fetch current template data
      const getResponse = await fetch(`/api/templates/${selectedTemplateId}`);
      if (!getResponse.ok) {
        throw new Error('Failed to fetch template');
      }
      const templateData = await getResponse.json();

      // Create new template with refined prompts
      const createResponse = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          fields: templateData.fields.map((f: TemplateField) => ({
            id: f.id,
            name: f.name,
            instructions: f.instructions,
            order: f.order,
          })),
          extraction_prompt: promptOverride || null,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create new template');
      }

      const newTemplate = await createResponse.json();
      setIsSavingTemplate(false);
      setShowSaveAsNewDialog(false);
      setNewTemplateName('');
      toast({
        title: "New Template Created",
        description: `Template "${newTemplateName}" created successfully with ID: ${newTemplate.id}`,
      });
    } catch (error) {
      console.error('Save as new template error:', error);
      setIsSavingTemplate(false);
      toast({
        title: "Creation Failed",
        description: "Failed to create new template. Please try again.",
        variant: "destructive",
      });
    }
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
      {step === 'upload' && (
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
      )}

      {step === 'select-template' && (
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

                      {/* Selection Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        {isSelected && (
                          <span className="text-xs font-medium text-blue-600">
                            Selected
                          </span>
                        )}
                      </div>

                      {/* Field Count */}
                      <p className="text-sm text-muted-foreground">
                        {template.fields?.length || 0} fields
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

      {/* Extracting Step - Loading State */}
      {step === 'extracting' && (
        <div className="flex flex-col items-center justify-center py-16">
          {!extractionError ? (
            <>
              {/* Loading Spinner */}
              <div className="mb-6">
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
              </div>

              {/* Loading Messages */}
              <h2 className="text-2xl font-semibold mb-2 text-blue-600">
                Extracting data from document...
              </h2>
              <p className="text-muted-foreground mb-4">
                This may take up to 30 seconds
              </p>
              <p className="text-sm text-muted-foreground">
                Processing your document with AI
              </p>
            </>
          ) : (
            <>
              {/* Error Display */}
              <Alert variant="destructive" className="max-w-2xl mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Extraction Failed</p>
                  <p>{extractionError}</p>
                </AlertDescription>
              </Alert>

              {/* Retry and Cancel Buttons */}
              <div className="flex gap-4">
                {extractionRetryable && (
                  <Button onClick={handleRetryExtraction} className="bg-blue-600 hover:bg-blue-700">
                    Retry Extraction
                  </Button>
                )}
                <Button variant="outline" onClick={handleCancelExtraction}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Results Step - Full Results Table (Story 2.4) */}
      {step === 'results' && (
        <div className="max-w-full">
          {/* Success Message */}
          <Alert className="mb-6 border-green-500 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900">
                Extraction complete - {extractedData?.length || 0} rows extracted
              </p>
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="mb-6 flex flex-wrap gap-3">
            <Button
              onClick={handleExportExcel}
              disabled={!extractedData || extractedData.length === 0 || isExporting}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-5 w-5" />
                  Export to Excel
                </>
              )}
            </Button>
            <Button
              onClick={handleAdjustPrompts}
              variant="outline"
              size="lg"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Add Extraction Instructions & Re-extract
            </Button>
            <Button
              onClick={handleProcessAnother}
              variant="outline"
              size="lg"
            >
              Process Another Document
            </Button>
            <Button
              onClick={() => window.location.href = '/templates'}
              variant="outline"
              size="lg"
            >
              Return to Templates
            </Button>
          </div>

          {/* Prompt Editing Panel */}
          <Collapsible
            open={isPromptPanelOpen}
            onOpenChange={setIsPromptPanelOpen}
            className="mb-6"
          >
            <CollapsibleContent>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Add Extraction Instructions</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPromptPanelOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Add extraction-specific instructions below. These will be combined with your template&apos;s existing prompts to improve results.
                  </p>

                  {/* Prompt Textarea */}
                  <div className="space-y-2">
                    <label htmlFor="prompt-override" className="text-sm font-medium">
                      Additional Extraction Instructions
                    </label>
                    <Textarea
                      id="prompt-override"
                      value={promptOverride}
                      onChange={(e) => setPromptOverride(e.target.value)}
                      placeholder="e.g., Extract dates as YYYY-MM-DD, include currency symbols..."
                      rows={7}
                      className="min-h-[140px] font-mono text-sm"
                      disabled={isReExtracting}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{promptOverride.length} characters</span>
                      {promptOverride !== currentPrompt && (
                        <span className="text-orange-600 font-medium">Modified from original</span>
                      )}
                    </div>
                  </div>

                  {/* Re-extraction Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={handleReExtract}
                      disabled={isReExtracting || !promptOverride.trim()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isReExtracting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Re-extracting...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Re-extract with Updated Prompt
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPromptOverride(currentPrompt);
                        setIsPromptPanelOpen(false);
                      }}
                      disabled={isReExtracting}
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* Divider */}
                  {promptOverride !== currentPrompt && promptOverride.trim() && (
                    <>
                      <div className="border-t pt-4 mt-2">
                        <p className="text-sm font-medium mb-3">Save Refined Prompt</p>
                        <p className="text-xs text-muted-foreground mb-3">
                          Save your refined extraction instructions back to the template
                        </p>

                        {/* Template Save Buttons */}
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setShowUpdateConfirmDialog(true)}
                            disabled={isSavingTemplate}
                          >
                            Update Original Template
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setShowSaveAsNewDialog(true)}
                            disabled={isSavingTemplate}
                          >
                            Save as New Template
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Row Count Summary and Filter Controls */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Row Count Summary */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {showLowConfidenceOnly
                        ? `Showing ${getRowCounts().filtered} of ${getRowCounts().total} rows`
                        : `Showing ${getRowCounts().total} rows`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{getRowCounts().high} high-confidence</span>
                  </div>
                  {getRowCounts().low > 0 && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>{getRowCounts().low} low-confidence</span>
                    </div>
                  )}
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="low-confidence-filter"
                    checked={showLowConfidenceOnly}
                    onCheckedChange={(checked) => setShowLowConfidenceOnly(checked === true)}
                  />
                  <label
                    htmlFor="low-confidence-filter"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Show low-confidence only
                  </label>
                </div>
              </div>

              {/* No results message for filter */}
              {showLowConfidenceOnly && getRowCounts().filtered === 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      No low-confidence rows found. All extractions are high-confidence!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              {/* Scrollable Table Container */}
              <div className="overflow-x-auto">
                <div className="max-h-[600px] overflow-y-auto">
                  <TooltipProvider>
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10 border-b shadow-sm">
                        <TableRow>
                          {/* Template Field Columns */}
                          {selectedTemplateFields
                            .sort((a, b) => a.order - b.order)
                            .map((field) => (
                              <TableHead
                                key={field.id}
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleSort(field.name)}
                              >
                                <div className="flex items-center gap-1">
                                  <span>{field.name}</span>
                                  {sortColumn === field.name && (
                                    sortDirection === 'asc' ? (
                                      <ArrowUp className="h-4 w-4" />
                                    ) : (
                                      <ArrowDown className="h-4 w-4" />
                                    )
                                  )}
                                  {sortColumn !== field.name && (
                                    <ArrowUpDown className="h-4 w-4 opacity-30" />
                                  )}
                                </div>
                              </TableHead>
                            ))}

                          {/* Confidence Column */}
                          <TableHead
                            className="cursor-pointer hover:bg-gray-50 transition-colors w-32"
                            onClick={() => handleSort('confidence')}
                          >
                            <div className="flex items-center gap-1 justify-end">
                              <span>Confidence</span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Low confidence: &lt; 70%</p>
                                  <p>High confidence: ≥ 70%</p>
                                </TooltipContent>
                              </Tooltip>
                              {sortColumn === 'confidence' && (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              )}
                              {sortColumn !== 'confidence' && (
                                <ArrowUpDown className="h-4 w-4 opacity-30" />
                              )}
                            </div>
                          </TableHead>

                          {/* Source Column */}
                          <TableHead
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleSort('source')}
                          >
                            <div className="flex items-center gap-1">
                              <span>Source</span>
                              {sortColumn === 'source' && (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              )}
                              {sortColumn !== 'source' && (
                                <ArrowUpDown className="h-4 w-4 opacity-30" />
                              )}
                            </div>
                          </TableHead>

                          {/* Page Column */}
                          <TableHead
                            className="cursor-pointer hover:bg-gray-50 transition-colors w-24"
                            onClick={() => handleSort('page')}
                          >
                            <div className="flex items-center gap-1">
                              <span>Page</span>
                              {sortColumn === 'page' && (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="h-4 w-4" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )
                              )}
                              {sortColumn !== 'page' && (
                                <ArrowUpDown className="h-4 w-4 opacity-30" />
                              )}
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {getProcessedData().map((row) => {
                          const isLowConfidence = row.confidence < 0.7;
                          return (
                            <TableRow
                              key={row.rowId}
                              className={isLowConfidence ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''}
                            >
                              {/* Template Field Values */}
                              {selectedTemplateFields
                                .sort((a, b) => a.order - b.order)
                                .map((field) => (
                                  <TableCell key={field.id}>
                                    {formatFieldValue(row.fields[field.name], field.name)}
                                  </TableCell>
                                ))}

                              {/* Confidence Value */}
                              <TableCell className="text-right font-medium">
                                <span className={isLowConfidence ? 'text-orange-600' : 'text-green-600'}>
                                  {formatConfidence(row.confidence)}
                                </span>
                              </TableCell>

                              {/* Source Filename */}
                              <TableCell>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-default">
                                      {truncateFilename(row.sourceMetadata.filename)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{row.sourceMetadata.filename}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>

                              {/* Page Number */}
                              <TableCell className="text-center">
                                {row.sourceMetadata.pageNumber || '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TooltipProvider>
                </div>
              </div>

              {/* Empty state (if no data after filtering) */}
              {getProcessedData().length === 0 && !showLowConfidenceOnly && (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No data to display</p>
                </div>
              )}
            </CardContent>
          </Card>
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
              Template Preview
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
                      .sort((a, b) => a.order - b.order)
                      .map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{field.name}</p>
                            {field.instructions && (
                              <p className="text-sm text-muted-foreground">{field.instructions}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No fields defined</p>
                )}
              </div>

              {/* Extraction Prompt Section */}
              <div>
                <h3 className="font-semibold mb-3">Extraction Prompt</h3>
                {previewTemplate.extraction_prompt ? (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{previewTemplate.extraction_prompt}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No extraction prompt defined</p>
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

      {/* Update Template Confirmation Dialog */}
      <Dialog open={showUpdateConfirmDialog} onOpenChange={setShowUpdateConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Original Template?</DialogTitle>
            <DialogDescription>
              This will update the original template with the refined prompts. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateConfirmDialog(false)}
              disabled={isSavingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTemplate}
              disabled={isSavingTemplate}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingTemplate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as New Template Dialog */}
      <Dialog open={showSaveAsNewDialog} onOpenChange={setShowSaveAsNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as New Template</DialogTitle>
            <DialogDescription>
              Create a new template with the refined prompts while preserving the original.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="new-template-name" className="text-sm font-medium">
                Template Name
              </label>
              <Input
                id="new-template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter new template name..."
                disabled={isSavingTemplate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveAsNewDialog(false);
                setNewTemplateName('');
              }}
              disabled={isSavingTemplate}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAsNewTemplate}
              disabled={isSavingTemplate || !newTemplateName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSavingTemplate ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filename Customization Dialog */}
      <Dialog open={showFilenameDialog} onOpenChange={setShowFilenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export to Excel</DialogTitle>
            <DialogDescription>
              Choose a filename for your Excel export or use the suggested name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="excel-filename" className="text-sm font-medium">
                Filename
              </label>
              <Input
                id="excel-filename"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Enter filename..."
                disabled={isExporting}
              />
              <p className="text-xs text-muted-foreground">
                .xlsx extension will be added automatically if not provided
              </p>
            </div>
            {exportError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{exportError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFilenameDialog(false);
                setExportError(null);
              }}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleQuickExport}
              disabled={isExporting}
            >
              Use Suggested Name
            </Button>
            <Button
              onClick={handleFilenameConfirm}
              disabled={isExporting || !customFilename.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
