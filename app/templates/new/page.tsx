"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Template Builder Page (Placeholder)
 * Story 1.5+: Manual Template Builder - Field Definition
 *
 * This is a placeholder page for future implementation.
 */
export default function NewTemplatePage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-10 px-4 max-w-7xl">
      <Button
        variant="ghost"
        onClick={() => router.push("/templates")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Templates
      </Button>

      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h1 className="text-3xl font-bold mb-4">Template Builder</h1>
        <p className="text-muted-foreground max-w-md">
          Template creation interface will be implemented in Story 1.5 (Manual
          Template Builder - Field Definition).
        </p>
      </div>
    </div>
  );
}
