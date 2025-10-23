"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, File as FileIcon, X, ArrowRight } from "lucide-react";

export default function ProcessDocumentsPage() {
  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    // TODO: Navigate to template selection in Story 2.2
    console.log("Next button clicked - navigate to template selection");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-blue-600">
          Process Production Documents
        </h1>
        <p className="text-muted-foreground">
          Upload documents to extract data using your saved templates
        </p>
      </div>

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
    </div>
  );
}
