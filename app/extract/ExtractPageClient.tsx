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

  const leftPanelSize = useExtractionStore((state: any) => state.leftPanelSize);
  const rightPanelSize = useExtractionStore((state: any) => state.rightPanelSize);
  const isLeftMaximized = useExtractionStore((state: any) => state.isLeftMaximized);
  const isRightMaximized = useExtractionStore((state: any) => state.isRightMaximized);
  const setPanelSizes = useExtractionStore((state: any) => state.setPanelSizes);
  const maximizeLeft = useExtractionStore((state: any) => state.maximizeLeft);
  const maximizeRight = useExtractionStore((state: any) => state.maximizeRight);
  const restoreLeft = useExtractionStore((state: any) => state.restoreLeft);
  const restoreRight = useExtractionStore((state: any) => state.restoreRight);
  const uploadedFile = useExtractionStore((state: any) => state.uploadedFile);
  const fields = useExtractionStore((state: any) => state.fields);
  const extractionPrompt = useExtractionStore((state: any) => state.extractionPrompt);
  const selectedTemplateId = useExtractionStore((state: any) => state.selectedTemplateId);
  const selectedTemplateName = useExtractionStore((state: any) => state.selectedTemplateName);
  const results = useExtractionStore((state: any) => state.results);
  const isExtracting = useExtractionStore((state: any) => state.isExtracting);
  const extractionError = useExtractionStore((state: any) => state.extractionError);
  const setResults = useExtractionStore((state: any) => state.setResults);
  const clearResults = useExtractionStore((state: any) => state.clearResults);
  const setIsExtracting = useExtractionStore((state: any) => state.setIsExtracting);
  const setExtractionError = useExtractionStore((state: any) => state.setExtractionError);

  // Batch extraction state (Story 3.11)
  const sessionId = useExtractionStore((state: any) => state.sessionId);
  const progressStatus = useExtractionStore((state: any) => state.progressStatus);
  const progressPercent = useExtractionStore((state: any) => state.progressPercent);
  const setSessionId = useExtractionStore((state: any) => state.setSessionId);
  const setProgressStatus = useExtractionStore((state: any) => state.setProgressStatus);
  const updateProgress = useExtractionStore((state: any) => state.updateProgress);
  const resetProgress = useExtractionStore((state: any) => state.resetProgress);

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

  // Extract button handler (Story 3.11 - Batch API with SSE)
  const handleExtract = async () => {
    // Validation: check uploadedFile and fields
    if (!uploadedFile || fields.length === 0) {
      return; // Button should be disabled
    }

    // Clear old data FIRST
    clearResults();
    setExtractionError(null);
    resetProgress();

    // Turn on loading indicator
    setIsExtracting(true);
    setProgressStatus('Initializing...');

    // Wait for React to render it
    await new Promise(resolve => setTimeout(resolve, 0));

    let eventSource: EventSource | null = null;

    try {
      // Create FormData with template snapshot
      const formData = new FormData();

      const template = {
        fields,
        extraction_prompt: extractionPrompt || null,
      };

      formData.append('template', JSON.stringify(template));
      formData.append('files', uploadedFile);

      // Create batch extraction session
      const response = await fetch('/api/extractions/batch', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create extraction session');
      }

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);
      setProgressStatus('Connecting to progress stream...');

      // Connect to SSE stream for real-time progress
      eventSource = new EventSource(`/api/extractions/batch/${newSessionId}/stream`);

      eventSource.onopen = () => {
        console.log('[SSE] Connected to progress stream');
      };

      eventSource.addEventListener('session_started', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Session started:', data);
        setProgressStatus('Session started');
        updateProgress(0, data.data.totalFiles, 0, 0);
      }) as EventListener);

      eventSource.addEventListener('file_parsing', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Parsing file:', data.data.filename);
        setProgressStatus(`Parsing: ${data.data.filename}`);
      }) as EventListener);

      eventSource.addEventListener('file_parsed', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] File parsed:', data.data.filename, `(${data.data.pageCount} pages)`);
      }) as EventListener);

      eventSource.addEventListener('document_detected', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Documents detected:', data.data.documentCount);
        setProgressStatus(`Detected ${data.data.documentCount} document(s)`);
      }) as EventListener);

      eventSource.addEventListener('extraction_started', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Extraction started:', data.data.chunkingStrategy);
        setProgressStatus(`Extracting data (${data.data.chunkingStrategy} strategy)`);
      }) as EventListener);

      eventSource.addEventListener('extraction_progress', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Progress:', data.data.progress + '%');
        updateProgress(
          data.data.filesProcessed,
          data.data.totalFiles,
          data.data.documentsProcessed,
          data.data.totalDocuments
        );
        setProgressStatus(`Processing... ${data.data.progress}%`);
      }) as EventListener);

      eventSource.addEventListener('extraction_completed', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Extraction completed:', data.data.rowCount, 'rows');
      }) as EventListener);

      eventSource.addEventListener('session_completed', (async (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.log('[SSE] Session completed:', data);
        setProgressStatus('Fetching results...');

        // Fetch final results
        const resultsResponse = await fetch(`/api/extractions/batch/${newSessionId}/results`);
        if (resultsResponse.ok) {
          const resultsData = await resultsResponse.json();
          setResults({
            success: true,
            data: resultsData.results || [],
            rowCount: resultsData.results?.length || 0,
            filename: uploadedFile?.name || 'batch',
          });
          setProgressStatus('Completed');
        } else {
          throw new Error('Failed to fetch results');
        }

        // Close SSE connection
        eventSource?.close();
        setIsExtracting(false);
      }) as EventListener);

      eventSource.addEventListener('session_failed', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.error('[SSE] Session failed:', data.data.error);
        throw new Error(data.data.error || 'Extraction failed');
      }) as EventListener);

      eventSource.addEventListener('extraction_failed', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        console.error('[SSE] Extraction failed:', data.data.error);
        setExtractionError(`Extraction failed: ${data.data.error}`);
      }) as EventListener);

      eventSource.addEventListener('rate_limit_wait', ((event: MessageEvent) => {
        const data = JSON.parse(event.data);
        const waitTimeSec = Math.ceil(data.data.waitTimeMs / 1000);
        console.log('[SSE] Rate limit - waiting:', waitTimeSec + 's');
        setProgressStatus(`Rate limit - waiting ${waitTimeSec}s...`);
      }) as EventListener);

      eventSource.onerror = (error) => {
        console.error('[SSE] Error:', error);
        eventSource?.close();
        // Don't throw immediately - session might still complete
      };

    } catch (error) {
      console.error('Extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Extraction failed. Please try again.';
      setExtractionError(errorMessage);
      setIsExtracting(false);
      eventSource?.close();
    }
  };

  // Check if Extract button should be disabled
  const isExtractDisabled = !uploadedFile || fields.length === 0 || isExtracting;

  // Tooltip message for disabled Extract button
  const getExtractTooltip = () => {
    if (isExtracting) {
      return progressStatus || 'Extraction in progress...';
    }
    if (!uploadedFile) return 'Please upload a file first';
    if (fields.length === 0) return 'Please add at least one field';
    return 'Extract data from document';
  };

  // Get button text based on extraction state
  const getButtonText = () => {
    if (!isExtracting) return 'Extract';
    if (progressStatus) return progressStatus;
    return 'Extracting...';
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
                                    <div className="flex flex-col items-start">
                                      <span>{getButtonText()}</span>
                                      {progressPercent > 0 && (
                                        <span className="text-xs opacity-70">{progressPercent}%</span>
                                      )}
                                    </div>
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
                    results={results?.data || []}
                    fields={fields}
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
