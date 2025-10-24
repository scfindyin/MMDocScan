"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ExtractionDetail, ExtractedRow } from "@/types/extraction";
import { AlertCircle, ArrowLeft, Download, ArrowUpDown } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/date";
import { generateExcelFile } from "@/lib/excel/export";

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
} | null;

export default function ExtractionDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const extractionId = params.id as string;

  const [extraction, setExtraction] = useState<ExtractionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [showLowConfidenceOnly, setShowLowConfidenceOnly] = useState(false);

  const LOW_CONFIDENCE_THRESHOLD = 0.7;

  const fetchExtraction = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/extractions/${extractionId}`);

      if (response.status === 404) {
        setError("Extraction not found. It may have been deleted or expired.");
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch extraction: ${response.statusText}`);
      }

      const data = await response.json();
      setExtraction(data.extraction);
    } catch (err: any) {
      console.error("Error fetching extraction:", err);
      setError(err.message || "Failed to load extraction");
    } finally {
      setLoading(false);
    }
  }, [extractionId]);

  useEffect(() => {
    fetchExtraction();
  }, [fetchExtraction]);

  function handleSort(key: string) {
    let direction: "asc" | "desc" = "asc";

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  }

  function getSortedData(): ExtractedRow[] {
    if (!extraction) return [];

    let sorted = [...extraction.extracted_data];

    // Apply low confidence filter
    if (showLowConfidenceOnly) {
      sorted = sorted.filter((row) => row.confidence < LOW_CONFIDENCE_THRESHOLD);
    }

    // Apply sorting
    if (sortConfig) {
      sorted.sort((a, b) => {
        const aValue = a.fields[sortConfig.key];
        const bValue = b.fields[sortConfig.key];

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        // Type-aware comparison
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        // String comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return sorted;
  }

  async function handleExportToExcel() {
    if (!extraction) return;

    try {
      setExporting(true);

      // Fetch template details for Excel generation via API
      const templateResponse = await fetch(`/api/templates/${extraction.template_id}`);

      if (!templateResponse.ok) {
        throw new Error("Failed to fetch template details");
      }

      const templateData = await templateResponse.json();
      const template = templateData.template;

      if (!template) {
        throw new Error("Template not found");
      }

      // Generate Excel file
      const buffer = await generateExcelFile(extraction.extracted_data, template);

      // Create blob and download
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename: template-name_document-name_extraction-date.xlsx
      const date = new Date(extraction.created_at).toISOString().split("T")[0];
      const filename = `${extraction.template_name.replace(/\s+/g, "-")}_${extraction.filename.replace(/\s+/g, "-")}_${date}.xlsx`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Downloaded ${filename}`,
      });
    } catch (err: any) {
      console.error("Error exporting to Excel:", err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "Failed to export Excel file",
      });
    } finally {
      setExporting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading extraction...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-4">
          <Button onClick={() => router.push("/extractions")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Extractions
          </Button>
          <Button variant="outline" onClick={fetchExtraction}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!extraction) {
    return null;
  }

  const sortedData = getSortedData();
  const fieldNames = extraction.extracted_data.length > 0
    ? Object.keys(extraction.extracted_data[0].fields)
    : [];

  const lowConfidenceCount = extraction.extracted_data.filter(
    (row) => row.confidence < LOW_CONFIDENCE_THRESHOLD
  ).length;
  const highConfidenceCount = extraction.row_count - lowConfidenceCount;

  // Extraction details view
  return (
    <TooltipProvider>
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        {/* Header with metadata */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/extractions")}
                className="mb-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Recent Extractions
              </Button>
              <h1 className="text-3xl font-bold">{extraction.filename}</h1>
              <p className="text-muted-foreground mt-1">
                Template: {extraction.template_name} • Extracted{" "}
                {formatRelativeTime(extraction.created_at)}
              </p>
            </div>
            <Button onClick={handleExportToExcel} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export to Excel"}
            </Button>
          </div>

          {/* Summary stats */}
          <Card>
            <CardHeader>
              <CardTitle>Extraction Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                  <p className="text-2xl font-bold">{extraction.row_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High Confidence</p>
                  <p className="text-2xl font-bold text-green-600">
                    {highConfidenceCount}
                  </p>
                </div>
                {lowConfidenceCount > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Low Confidence</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {lowConfidenceCount}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confidence filter toggle */}
        {lowConfidenceCount > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Button
              variant={showLowConfidenceOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowLowConfidenceOnly(!showLowConfidenceOnly)}
            >
              {showLowConfidenceOnly
                ? `Showing ${lowConfidenceCount} Low Confidence Rows`
                : `Filter Low Confidence (${lowConfidenceCount})`}
            </Button>
            {showLowConfidenceOnly && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-muted-foreground cursor-help">
                      Threshold: &lt; {LOW_CONFIDENCE_THRESHOLD}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Rows with confidence score below {LOW_CONFIDENCE_THRESHOLD} are
                    considered low confidence
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {lowConfidenceCount === 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              🎉 All {extraction.row_count} rows have high confidence scores!
            </AlertDescription>
          </Alert>
        )}

        {/* Results table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {fieldNames.map((fieldName) => (
                  <TableHead key={fieldName}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(fieldName)}
                      className="hover:bg-transparent p-0 h-auto font-semibold"
                    >
                      {fieldName}
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                ))}
                <TableHead>Confidence</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={fieldNames.length + 2}
                    className="text-center text-muted-foreground"
                  >
                    {showLowConfidenceOnly
                      ? "No low confidence rows found"
                      : "No data available"}
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((row) => (
                  <TableRow
                    key={row.rowId}
                    className={
                      row.confidence < LOW_CONFIDENCE_THRESHOLD
                        ? "bg-yellow-50"
                        : ""
                    }
                  >
                    {fieldNames.map((fieldName) => (
                      <TableCell key={`${row.rowId}-${fieldName}`}>
                        {row.fields[fieldName] ?? "—"}
                      </TableCell>
                    ))}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                row.confidence >= LOW_CONFIDENCE_THRESHOLD
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {(row.confidence * 100).toFixed(0)}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Confidence score: {row.confidence.toFixed(3)}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">
                              {row.sourceMetadata.filename.length > 20
                                ? row.sourceMetadata.filename.substring(0, 20) + "..."
                                : row.sourceMetadata.filename}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-xs">
                              <div>File: {row.sourceMetadata.filename}</div>
                              {row.sourceMetadata.pageNumber && (
                                <div>Page: {row.sourceMetadata.pageNumber}</div>
                              )}
                              <div>
                                Extracted: {new Date(row.sourceMetadata.extractedAt).toLocaleString()}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
