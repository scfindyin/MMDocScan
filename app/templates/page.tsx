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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Template } from "@/types/template";
import { AlertCircle, Plus, Edit, Eye } from "lucide-react";

// Format date string to readable format
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/templates");

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      setError(err.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateNew() {
    router.push("/templates/new");
  }

  function handleTemplateClick(templateId: string) {
    router.push(`/templates/${templateId}`);
  }

  function handleEdit(e: React.MouseEvent, templateId: string) {
    e.stopPropagation(); // Prevent row click
    router.push(`/templates/${templateId}/edit`);
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading templates...</p>
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
          <Button onClick={fetchTemplates}>Retry</Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (templates.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-2xl font-bold mb-2">No templates yet</h2>
          <p className="text-muted-foreground mb-6">
            Create your first template to get started with document extraction.
          </p>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Template
          </Button>
        </div>
      </div>
    );
  }

  // Template list view
  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl">
      {/* Header with Create button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage your document extraction templates
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Template
        </Button>
      </div>

      {/* Desktop Table View (hidden on tablet/mobile) */}
      <div className="hidden lg:block">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Fields</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow
                  key={template.id}
                  onClick={() => handleTemplateClick(template.id)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{formatDate(template.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {template.fields?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEdit(e, template.id)}
                        title="Edit template"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tablet/Mobile Card View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        {templates.map((template) => (
          <Card
            key={template.id}
            onClick={() => handleTemplateClick(template.id)}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription>
                    {template.fields?.length ?? 0} fields
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEdit(e, template.id)}
                  title="Edit template"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Created: {formatDate(template.created_at)}
                </span>
                <span className="text-muted-foreground">
                  Fields: {template.fields?.length ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
