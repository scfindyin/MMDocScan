'use client';

import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Loader2 } from 'lucide-react';
import { FieldResult } from '@/stores/extractionStore';

interface ResultsTableProps {
  results: FieldResult[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ResultsTable({ results, isLoading = false, error = null, onRetry }: ResultsTableProps) {
  // Error State
  if (error) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-semibold">Extraction Failed</p>
              <p className="text-sm">{error}</p>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Try Again
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Extracting Data...</p>
            <p className="text-sm text-gray-500 mt-1">
              This may take a few moments. Please wait.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Empty State - No Results
  if (!results || results.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 text-center">
            No extraction results yet. Upload a file and click Extract to begin.
          </p>
        </div>
      </Card>
    );
  }

  // Success State - Display Results Table
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Extracted Fields</h3>
          <p className="text-sm text-gray-500">
            {results.length} {results.length === 1 ? 'field' : 'fields'} extracted
          </p>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3 font-semibold">Field Name</TableHead>
                <TableHead className="font-semibold">Extracted Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-gray-700">
                    {result.fieldName}
                  </TableCell>
                  <TableCell className="text-gray-900">
                    {result.extractedValue !== null && result.extractedValue !== undefined && result.extractedValue !== '' ? (
                      <span>{String(result.extractedValue)}</span>
                    ) : (
                      <span className="text-gray-400 italic">No value extracted</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Empty results warning */}
        {results.every((r) => !r.extractedValue || r.extractedValue === '') && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              No data was extracted from the document. This could mean the document is empty or the fields don&apos;t match the content.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
