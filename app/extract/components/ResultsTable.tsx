'use client';

import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ExtractedRow } from '@/stores/extractionStore';
import { TemplateField } from '@/types/template';

interface ResultsTableProps {
  results: ExtractedRow[];
  fields: TemplateField[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ResultsTable({
  results,
  fields,
  isLoading = false,
  error = null,
  onRetry,
}: ResultsTableProps) {
  console.log('📊 ResultsTable render:', {
    isLoading,
    hasError: !!error,
    resultCount: results?.length || 0,
    fieldsCount: fields?.length || 0
  });

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
                <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
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

  // Success State - Display Results Table in ROW x COLUMN format
  // Columns: All template fields
  // Rows: Each ExtractedRow with confidence and source metadata

  const fieldNames = fields.map((f) => f.name);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Extracted Data</h3>
          <div className="text-sm text-gray-500">
            {results.length} {results.length === 1 ? 'row' : 'rows'} extracted
          </div>
        </div>

        {/* Results table with horizontal scroll */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Confidence column */}
                <TableHead className="font-semibold whitespace-nowrap w-24">
                  Confidence
                </TableHead>
                {/* Field columns */}
                {fieldNames.map((fieldName) => (
                  <TableHead key={fieldName} className="font-semibold whitespace-nowrap">
                    {fieldName}
                  </TableHead>
                ))}
                {/* Source column */}
                <TableHead className="font-semibold whitespace-nowrap w-48">
                  Source
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((row, rowIndex) => (
                <TableRow key={row.rowId || rowIndex}>
                  {/* Confidence cell */}
                  <TableCell className="text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        row.confidence >= 0.8
                          ? 'bg-green-100 text-green-800'
                          : row.confidence >= 0.6
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {Math.round(row.confidence * 100)}%
                    </span>
                  </TableCell>

                  {/* Field value cells */}
                  {fieldNames.map((fieldName) => {
                    const value = row.fields[fieldName];
                    const isEmpty =
                      value === null || value === undefined || value === '';

                    return (
                      <TableCell key={`${row.rowId}-${fieldName}`} className="max-w-xs">
                        {isEmpty ? (
                          <span className="text-gray-400 italic text-sm">—</span>
                        ) : (
                          <span className="text-gray-900">{String(value)}</span>
                        )}
                      </TableCell>
                    );
                  })}

                  {/* Source metadata cell */}
                  <TableCell className="text-sm text-gray-600">
                    <div className="space-y-1">
                      <div className="truncate" title={row.sourceMetadata.filename}>
                        {row.sourceMetadata.filename}
                      </div>
                      {row.sourceMetadata.pageNumber && (
                        <div className="text-xs text-gray-500">
                          Page {row.sourceMetadata.pageNumber}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Low confidence warning */}
        {results.some((r) => r.confidence < 0.7) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              Some rows have low confidence scores (below 70%). Please review these
              entries carefully.
            </AlertDescription>
          </Alert>
        )}

        {/* Empty fields warning */}
        {results.every((r) =>
          fieldNames.every((fieldName) => {
            const value = r.fields[fieldName];
            return value === null || value === undefined || value === '';
          })
        ) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="ml-2">
              No data was extracted from the document. This could mean the document is
              empty or the fields don&apos;t match the content.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}
