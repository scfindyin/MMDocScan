import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExtractionStore {
  // Panel state
  leftPanelSize: number; // 0-100 percentage
  rightPanelSize: number; // 0-100 percentage
  isLeftMaximized: boolean;
  isRightMaximized: boolean;

  // Actions
  setPanelSizes: (left: number, right: number) => void;
  maximizeLeft: () => void;
  maximizeRight: () => void;
  restoreLeft: () => void;
  restoreRight: () => void;
}

export const useExtractionStore = create<ExtractionStore>()(
  persist(
    (set) => ({
      // Initial state - default sizes
      leftPanelSize: 30, // 300px at 1000px viewport
      rightPanelSize: 70, // Fluid (remaining space)
      isLeftMaximized: false,
      isRightMaximized: false,

      // Actions
      setPanelSizes: (left, right) =>
        set({
          leftPanelSize: left,
          rightPanelSize: right,
        }),

      maximizeLeft: () =>
        set((state) => ({
          isLeftMaximized: true,
          isRightMaximized: false,
          // Store current sizes before maximizing (for restore)
          leftPanelSize: state.isLeftMaximized ? state.leftPanelSize : 95,
          rightPanelSize: 5, // Thin bar (~20px)
        })),

      maximizeRight: () =>
        set((state) => ({
          isLeftMaximized: false,
          isRightMaximized: true,
          leftPanelSize: 5, // Thin bar (~20px)
          // Store current sizes before maximizing (for restore)
          rightPanelSize: state.isRightMaximized ? state.rightPanelSize : 95,
        })),

      restoreLeft: () =>
        set({
          isLeftMaximized: false,
          leftPanelSize: 30, // Restore to default
          rightPanelSize: 70,
        }),

      restoreRight: () =>
        set({
          isRightMaximized: false,
          leftPanelSize: 30, // Restore to default
          rightPanelSize: 70,
        }),
    }),
    {
      name: 'extraction-store', // localStorage key
      // Only persist panel sizes and maximized state
      partialize: (state) => ({
        leftPanelSize: state.leftPanelSize,
        rightPanelSize: state.rightPanelSize,
        isLeftMaximized: state.isLeftMaximized,
        isRightMaximized: state.isRightMaximized,
      }),
    }
  )
);
