'use client';

import { useRef, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels';
import { useExtractionStore } from '@/stores/extractionStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TemplateSection } from './components/TemplateSection';
import { FileUploadSection } from './components/FileUploadSection';
import { ResultsTable } from './components/ResultsTable';
import { Loader2, Play } from 'lucide-react';

export default function ExtractPageClient() {
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);

  const {
    leftPanelSize,
    rightPanelSize,
    isLeftMaximized,
    isRightMaximized,
    setPanelSizes,
    maximizeLeft,
    maximizeRight,
    restoreLeft,
    restoreRight,
    uploadedFile,
    fields,
    extractionPrompt,
    selectedTemplateId,
    selectedTemplateName,
    results,
    isExtracting,
    extractionError,
    setResults,
    clearResults,
    setIsExtracting,
    setExtractionError,
  } = useExtractionStore();

  const handleResize = (sizes: number[]) => {
    if (sizes.length === 2) {
      setPanelSizes(sizes[0], sizes[1]);
    }
  };

  const handleMaximizeLeft = () => {
    maximizeLeft();
    leftPanelRef.current?.resize(92);
    rightPanelRef.current?.resize(8);
  };

  const handleMaximizeRight = () => {
    maximizeRight();
    leftPanelRef.current?.resize(8);
    rightPanelRef.current?.resize(92);
  };

  const handleRestoreLeft = () => {
    restoreLeft();
    leftPanelRef.current?.resize(30);
    rightPanelRef.current?.resize(70);
  };

  const handleRestoreRight = () => {
    restoreRight();
    leftPanelRef.current?.resize(30);
    rightPanelRef.current?.resize(70);
  };

  // Extract button handler (Story 3.7)
  const handleExtract = async () => {
    // Validation: check uploadedFile and fields
    if (!uploadedFile || fields.length === 0) {
      return; // Button should be disabled
    }

    // Start extraction
    setIsExtracting(true);
    clearResults();
    setExtractionError(null);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('fields', JSON.stringify(fields));
      if (extractionPrompt) {
        formData.append('extraction_prompt', extractionPrompt);
      }
      if (selectedTemplateId) {
        formData.append('template_id', selectedTemplateId);
      }
      if (selectedTemplateName) {
        formData.append('template_name', selectedTemplateName);
      }

      // Call API
      const response = await fetch('/api/extractions/single', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const data = await response.json();

      // Transform API response to match store format
      const extractionResult = {
        extractionId: data.extraction_id,
        filename: data.filename,
        templateId: data.template_id,
        templateName: data.template_name,
        timestamp: data.timestamp,
        results: data.results.map((r: any) => ({
          fieldName: r.field_name,
          fieldType: r.field_type,
          extractedValue: r.extracted_value,
        })),
      };

      setResults(extractionResult);
    } catch (error) {
      console.error('Extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Extraction failed. Please try again.';
      setExtractionError(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };

  // Check if Extract button should be disabled
  const isExtractDisabled = !uploadedFile || fields.length === 0 || isExtracting;

  // Tooltip message for disabled Extract button
  const getExtractTooltip = () => {
    if (isExtracting) return 'Extraction in progress...';
    if (!uploadedFile) return 'Please upload a file first';
    if (fields.length === 0) return 'Please add at least one field';
    return 'Extract data from document';
  };

  // Restore panel sizes on mount from localStorage
  useEffect(() => {
    if (isLeftMaximized) {
      leftPanelRef.current?.resize(92);
      rightPanelRef.current?.resize(8);
    } else if (isRightMaximized) {
      leftPanelRef.current?.resize(8);
      rightPanelRef.current?.resize(92);
    } else {
      leftPanelRef.current?.resize(leftPanelSize);
      rightPanelRef.current?.resize(rightPanelSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount to restore from localStorage

  return (
    <div className="h-screen flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-white px-6 py-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">Batch Extraction</h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure templates and extract data from multiple documents
        </p>
      </div>

      {/* Resizable Panel Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <PanelGroup
          direction="horizontal"
          onLayout={handleResize}
          className="h-full"
        >
          {/* Left Panel - Configuration */}
          <Panel
            ref={leftPanelRef}
            defaultSize={leftPanelSize}
            minSize={8}
            maxSize={92}
          >
            {isRightMaximized && rightPanelSize < 15 ? (
              // Thin bar when right is maximized
              <div
                className="h-full bg-gray-100 border-r flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-all duration-300"
                onClick={handleRestoreRight}
                title="Click to restore panels"
              >
                <div className="writing-mode-vertical text-xs text-gray-600 py-4">
                  Configuration
                </div>
              </div>
            ) : (
              <div className="h-full bg-white border-r flex flex-col relative">
                {/* Maximize Button - Top Right */}
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    onClick={handleMaximizeLeft}
                    variant="outline"
                    size="sm"
                    title="Maximize configuration panel"
                  >
                    ▶
                  </Button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 flex flex-col p-6 overflow-auto">
                  <h2 className="text-lg font-semibold mb-4 pr-12">
                    Template Configuration
                  </h2>
                  <div className="space-y-6">
                    <TemplateSection />
                    <FileUploadSection />

                    {/* Extract Button (Story 3.7) */}
                    <div className="pt-4 border-t">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Button
                                onClick={handleExtract}
                                disabled={isExtractDisabled}
                                className="w-full"
                                size="lg"
                              >
                                {isExtracting ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Extracting...
                                  </>
                                ) : (
                                  <>
                                    <Play className="mr-2 h-4 w-4" />
                                    Extract
                                  </>
                                )}
                              </Button>
                            </div>
                          </TooltipTrigger>
                          {isExtractDisabled && (
                            <TooltipContent>
                              <p>{getExtractTooltip()}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-blue-500 transition-colors cursor-col-resize" />

          {/* Right Panel - Results */}
          <Panel
            ref={rightPanelRef}
            defaultSize={rightPanelSize}
            minSize={8}
            maxSize={92}
          >
            {isLeftMaximized && leftPanelSize < 15 ? (
              // Thin bar when left is maximized
              <div
                className="h-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-all duration-300"
                onClick={handleRestoreLeft}
                title="Click to restore panels"
              >
                <div className="writing-mode-vertical text-xs text-gray-600 py-4">
                  Results
                </div>
              </div>
            ) : (
              <div className="h-full bg-white flex flex-col relative">
                {/* Maximize Button - Top Right */}
                <div className="absolute top-4 right-4 z-10">
                  <Button
                    onClick={handleMaximizeRight}
                    variant="outline"
                    size="sm"
                    title="Maximize results panel"
                  >
                    ◀
                  </Button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 flex flex-col p-6 overflow-auto">
                  <h2 className="text-lg font-semibold mb-4 pr-12">
                    Extraction Results
                  </h2>
                  <ResultsTable
                    results={results?.results || []}
                    isLoading={isExtracting}
                    error={extractionError}
                    onRetry={handleExtract}
                  />
                </div>
              </div>
            )}
          </Panel>
        </PanelGroup>
      </div>

      {/* CSS for vertical text */}
      <style jsx>{`
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
        }
      `}</style>
    </div>
  );
}
