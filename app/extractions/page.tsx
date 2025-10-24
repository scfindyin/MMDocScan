"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ExtractionListItem } from "@/types/extraction";
import { AlertCircle, FileText, Trash2, Eye } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/date";

export default function ExtractionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [extractions, setExtractions] = useState<ExtractionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchExtractions();
  }, []);

  async function fetchExtractions() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/extractions");

      if (!response.ok) {
        throw new Error(`Failed to fetch extractions: ${response.statusText}`);
      }

      const data = await response.json();
      setExtractions(data.extractions || []);
    } catch (err: any) {
      console.error("Error fetching extractions:", err);
      setError(err.message || "Failed to load extractions");
    } finally {
      setLoading(false);
    }
  }

  function handleExtractionClick(extractionId: string) {
    router.push(`/extractions/${extractionId}`);
  }

  async function handleClearHistory() {
    try {
      setClearing(true);

      const response = await fetch("/api/extractions", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to clear history");
      }

      const data = await response.json();

      toast({
        title: "History Cleared",
        description: data.message || "All extractions have been deleted",
      });

      // Refresh the list
      setExtractions([]);
      setShowClearDialog(false);
    } catch (err: any) {
      console.error("Error clearing history:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to clear history",
      });
    } finally {
      setClearing(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading extractions...</p>
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
        <div className="mt-4">
          <Button onClick={fetchExtractions}>Retry</Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (extractions.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No recent extractions</h2>
          <p className="text-muted-foreground mb-6">
            Process documents to see your extraction history here.
          </p>
          <Button onClick={() => router.push("/process")}>
            Process Document
          </Button>
        </div>
      </div>
    );
  }

  // Extraction list view
  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl">
      {/* Header with Clear History button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Recent Extractions</h1>
          <p className="text-muted-foreground mt-1">
            View and re-export your recent extraction results
          </p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowClearDialog(true)}
          disabled={extractions.length === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Clear History
        </Button>
      </div>

      {/* Desktop Table View (hidden on tablet/mobile) */}
      <div className="hidden lg:block">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Extracted</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extractions.map((extraction) => (
                <TableRow
                  key={extraction.id}
                  onClick={() => handleExtractionClick(extraction.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {extraction.filename}
                  </TableCell>
                  <TableCell>{extraction.template_name}</TableCell>
                  <TableCell>
                    {formatRelativeTime(extraction.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {extraction.row_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExtractionClick(extraction.id);
                      }}
                      title="View extraction"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tablet/Mobile Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {extractions.map((extraction) => (
          <Card
            key={extraction.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleExtractionClick(extraction.id)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{extraction.filename}</CardTitle>
              <CardDescription>{extraction.template_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Extracted:</span>
                  <span>{formatRelativeTime(extraction.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rows:</span>
                  <span className="font-medium">{extraction.row_count}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExtractionClick(extraction.id);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Extraction History?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {extractions.length} extraction
              {extractions.length === 1 ? "" : "s"} from your history. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              disabled={clearing}
            >
              {clearing ? "Clearing..." : "Clear History"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
