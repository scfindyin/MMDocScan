'use client';

import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { useExtractionStore } from '@/stores/extractionStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ExtractPageClient() {
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
  } = useExtractionStore();

  const handleResize = (sizes: number[]) => {
    if (sizes.length === 2) {
      setPanelSizes(sizes[0], sizes[1]);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Page Header */}
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">Batch Extraction</h1>
        <p className="text-sm text-gray-600 mt-1">
          Configure templates and extract data from multiple documents
        </p>
      </div>

      {/* Resizable Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup
          direction="horizontal"
          onLayout={handleResize}
          className="h-full"
        >
          {/* Left Panel - Configuration */}
          <Panel
            defaultSize={leftPanelSize}
            minSize={25} // 250px at 1000px viewport
            maxSize={95}
            className="relative transition-all duration-300 ease-in-out"
            collapsible={true}
          >
            {isLeftMaximized ? (
              <div className="h-full bg-white border-r p-6">
                <Card className="p-6 h-full flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">
                    Template Configuration
                  </h2>
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Coming in Story 3.2: Tag-Based Template Builder UI</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={restoreLeft}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      Restore ▶
                    </Button>
                  </div>
                </Card>
              </div>
            ) : isRightMaximized ? (
              // Thin bar when right is maximized
              <div
                className="h-full bg-gray-100 border-r flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={restoreRight}
                title="Click to restore left panel"
              >
                <div className="writing-mode-vertical text-xs text-gray-600 py-4">
                  Configuration
                </div>
              </div>
            ) : (
              <div className="h-full bg-white border-r p-6">
                <Card className="p-6 h-full flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">
                    Template Configuration
                  </h2>
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Coming in Story 3.2: Tag-Based Template Builder UI</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={maximizeLeft}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      ◀ Maximize
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-blue-500 transition-colors cursor-col-resize" />

          {/* Right Panel - Results */}
          <Panel
            defaultSize={rightPanelSize}
            minSize={60} // 600px at 1000px viewport
            maxSize={95}
            className="relative transition-all duration-300 ease-in-out"
            collapsible={true}
          >
            {isRightMaximized ? (
              <div className="h-full bg-white p-6">
                <Card className="p-6 h-full flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">
                    Extraction Results
                  </h2>
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Coming in Story 3.7: Basic Extraction with Results Table</p>
                  </div>
                  <div className="mt-4 flex justify-start">
                    <Button
                      onClick={restoreRight}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      ◀ Restore
                    </Button>
                  </div>
                </Card>
              </div>
            ) : isLeftMaximized ? (
              // Thin bar when left is maximized
              <div
                className="h-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={restoreLeft}
                title="Click to restore right panel"
              >
                <div className="writing-mode-vertical text-xs text-gray-600 py-4">
                  Results
                </div>
              </div>
            ) : (
              <div className="h-full bg-white p-6">
                <Card className="p-6 h-full flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">
                    Extraction Results
                  </h2>
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <p>Coming in Story 3.7: Basic Extraction with Results Table</p>
                  </div>
                  <div className="mt-4 flex justify-start">
                    <Button
                      onClick={maximizeRight}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      Maximize ▶
                    </Button>
                  </div>
                </Card>
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
