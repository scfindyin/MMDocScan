'use client';

import { useDropzone } from 'react-dropzone';
import { useExtractionStore } from '@/stores/extractionStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, X } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

export function FileUploadSection() {
  const { uploadedFile, setUploadedFile, removeUploadedFile } = useExtractionStore();

  // Configure react-dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Handle rejected files (validation errors)
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0].code === 'file-too-large') {
          const fileSizeMB = (rejection.file.size / 1024 / 1024).toFixed(1);
          alert(`File size exceeds 10MB limit. File size: ${fileSizeMB}MB`);
        } else if (rejection.errors[0].code === 'file-invalid-type') {
          alert('File type not supported. Please upload a PDF file.');
        } else {
          alert(rejection.errors[0].message);
        }
        return;
      }

      // Handle accepted files
      if (acceptedFiles.length > 0) {
        setUploadedFile(acceptedFiles[0]);
      }
    },
  });

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
  };

  // Remove file handler
  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering dropzone click
    removeUploadedFile();
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Upload Document</h3>

      {/* Empty State - Upload Area */}
      {!uploadedFile && (
        <Card
          {...getRootProps()}
          className={`border-2 border-dashed p-6 transition-colors cursor-pointer ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <Upload className="h-10 w-10 text-gray-400" />
            {isDragActive ? (
              <p className="text-sm text-blue-600 font-medium">Drop the PDF file here</p>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">Click to browse</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF files only (max 10MB)</p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Uploaded State - File Display Card */}
      {uploadedFile && (
        <Card className="border-2 border-gray-300 p-4">
          <div className="flex items-start gap-3">
            {/* PDF Icon */}
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-red-500" />
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate" title={uploadedFile.name}>
                {uploadedFile.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                <span className="text-xs text-gray-400">•</span>
                <p className="text-xs text-gray-500">-- pages</p>
              </div>
            </div>

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0 h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
              onClick={handleRemoveFile}
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
