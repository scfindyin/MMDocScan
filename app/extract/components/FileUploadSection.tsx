'use client';

import { useDropzone } from 'react-dropzone';
import { useExtractionStore } from '@/stores/extractionStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Upload, Plus, AlertCircle } from 'lucide-react';
import { FileListItem } from './FileListItem';
import { formatFileSize, FILE_UPLOAD_LIMITS } from '@/lib/utils/file';
import { useCallback } from 'react';
import type { UploadedFile } from '@/lib/utils/file';

export function FileUploadSection() {
  const {
    uploadedFiles,
    isAddingFiles,
    addFiles,
    removeFile,
    clearAllFiles,
    getFileCount,
    getTotalSize,
  } = useExtractionStore();

  // Handle file drop/selection
  const handleFilesAccepted = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      addFiles(acceptedFiles);
    }
  }, [addFiles]);

  // Configure react-dropzone for multi-file
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true, // Enable multi-file selection
    onDrop: (acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(rejection => {
          const error = rejection.errors[0];
          if (error.code === 'file-invalid-type') {
            return `${rejection.file.name}: Not a PDF file`;
          }
          return `${rejection.file.name}: ${error.message}`;
        });
        alert(`Some files were rejected:\n${errors.join('\n')}`);
      }

      // Add accepted files
      handleFilesAccepted(acceptedFiles);
    },
    noClick: uploadedFiles.length > 0, // Disable click when files present
  });

  // Calculate statistics
  const fileCount = getFileCount();
  const totalSize = getTotalSize();
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);

  // Check if we're at limits
  const atFileLimit = fileCount >= FILE_UPLOAD_LIMITS.MAX_FILES;
  const atSizeLimit = totalSize >= FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Upload Documents</h3>
        {fileCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFiles}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Empty State - Upload Area */}
      {fileCount === 0 && (
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
              <p className="text-sm text-blue-600 font-medium">Drop the PDF files here</p>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-blue-600">Click to browse</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  Multiple PDF files • Max {FILE_UPLOAD_LIMITS.MAX_FILES} files • {FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE_MB}MB total
                </p>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Files List */}
      {fileCount > 0 && (
        <Card className="border-2 border-gray-300">
          {/* File Statistics */}
          <div className="px-4 py-2 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </p>
              <p className="text-xs text-gray-500">
                {totalSizeMB} MB total
              </p>
            </div>

            {/* Warnings for limits */}
            {atFileLimit && (
              <Alert className="mt-2 py-1">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Maximum file limit reached ({FILE_UPLOAD_LIMITS.MAX_FILES} files)
                </AlertDescription>
              </Alert>
            )}
            {atSizeLimit && (
              <Alert className="mt-2 py-1">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Maximum size limit reached ({FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE_MB}MB)
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Scrollable File List */}
          <div
            className={`p-2 ${
              fileCount > FILE_UPLOAD_LIMITS.SCROLLABLE_THRESHOLD
                ? 'max-h-[320px] overflow-y-auto'
                : ''
            }`}
          >
            {uploadedFiles.map((file: UploadedFile) => (
              <FileListItem
                key={file.id}
                file={file}
                onRemove={removeFile}
              />
            ))}
          </div>

          {/* Add More Files Button */}
          {!atFileLimit && !atSizeLimit && (
            <div className="px-4 py-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={open}
                disabled={isAddingFiles}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add more files
              </Button>
            </div>
          )}

          {/* Drop Zone Overlay for Adding Files */}
          {!atFileLimit && !atSizeLimit && (
            <div
              {...getRootProps()}
              className={`${
                isDragActive
                  ? 'fixed inset-0 z-50 bg-blue-500 bg-opacity-10 border-4 border-dashed border-blue-500 flex items-center justify-center'
                  : 'hidden'
              }`}
            >
              <div className="bg-white rounded-lg shadow-lg p-6">
                <p className="text-lg font-semibold text-blue-600">
                  Drop files to add them
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Loading State */}
      {isAddingFiles && (
        <p className="text-xs text-gray-500 text-center">Processing files...</p>
      )}
    </div>
  );
}