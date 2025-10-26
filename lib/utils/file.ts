import { nanoid } from 'nanoid';

// File status type matching Story 3.8 specification
export type FileStatus = 'pending' | 'validating' | 'ready' | 'error';

// File upload limits
export const FILE_UPLOAD_LIMITS = {
  MAX_FILES: 100,
  MAX_TOTAL_SIZE_MB: 100,
  MAX_TOTAL_SIZE_BYTES: 100 * 1024 * 1024,
  SCROLLABLE_THRESHOLD: 5,
  DEBOUNCE_DELAY: 300, // ms
};

// Uploaded file interface
export interface UploadedFile {
  id: string;
  file: File;
  filename: string;
  size: number; // in bytes
  pageCount?: number; // N/A until Story 3.9
  status: FileStatus;
  errorMessage?: string;
}

/**
 * Generate a unique file ID using nanoid
 */
export function generateFileId(): string {
  return nanoid();
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

/**
 * State machine for file status transitions
 */
export function getNextFileStatus(
  currentStatus: FileStatus,
  action: 'validate' | 'success' | 'error' | 'retry'
): FileStatus {
  switch (currentStatus) {
    case 'pending':
      return action === 'validate' ? 'validating' : currentStatus;
    case 'validating':
      if (action === 'success') return 'ready';
      if (action === 'error') return 'error';
      return currentStatus;
    case 'ready':
      return action === 'retry' ? 'pending' : currentStatus;
    case 'error':
      return action === 'retry' ? 'pending' : currentStatus;
    default:
      return currentStatus;
  }
}

/**
 * Validate files against upload limits
 */
export function validateFiles(
  existingFiles: UploadedFile[],
  newFiles: File[]
): { valid: boolean; error?: string } {
  // Check file count
  const totalCount = existingFiles.length + newFiles.length;
  if (totalCount > FILE_UPLOAD_LIMITS.MAX_FILES) {
    return {
      valid: false,
      error: `Cannot upload more than ${FILE_UPLOAD_LIMITS.MAX_FILES} files. You have ${existingFiles.length} files and are trying to add ${newFiles.length} more.`,
    };
  }

  // Check total size
  const existingSize = existingFiles.reduce((sum, f) => sum + f.size, 0);
  const newSize = newFiles.reduce((sum, f) => sum + f.size, 0);
  const totalSize = existingSize + newSize;

  if (totalSize > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE_BYTES) {
    const totalSizeMB = (totalSize / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `Total size exceeds ${FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE_MB}MB limit. Total size would be ${totalSizeMB}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Create an UploadedFile object from a File
 */
export function createUploadedFile(file: File): UploadedFile {
  return {
    id: generateFileId(),
    file,
    filename: file.name,
    size: file.size,
    status: 'validating',
    pageCount: undefined, // Will be populated in Story 3.9
  };
}

/**
 * Simple debounce utility
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}