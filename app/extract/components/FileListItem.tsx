'use client';

import { Button } from '@/components/ui/button';
import { FileText, X, AlertCircle } from 'lucide-react';
import { UploadedFile } from '@/lib/utils/file';
import { formatFileSize } from '@/lib/utils/file';

interface FileListItemProps {
  file: UploadedFile;
  onRemove: (id: string) => void;
}

export function FileListItem({ file, onRemove }: FileListItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
      {/* File Icon */}
      <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
          {file.filename}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
          <span className="text-xs text-gray-400">•</span>
          <p className="text-xs text-gray-500">
            {file.pageCount ? `${file.pageCount} pages` : 'N/A pages'}
          </p>
        </div>
      </div>

      {/* Status Indicator */}
      {file.status === 'validating' && (
        <span className="text-xs text-blue-600">Validating...</span>
      )}
      {file.status === 'error' && (
        <div className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600" title={file.errorMessage}>
            {file.errorMessage || 'Error'}
          </span>
        </div>
      )}

      {/* Remove Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
        onClick={() => onRemove(file.id)}
        title="Remove file"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}