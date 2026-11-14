import type { FarmPlot } from '../types/farm';

const STORAGE_KEY = 'tamra_saved_farms_v1';

export interface PersistedFarmWorkspace {
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
  savedAt: string;
}

export function loadPersistedFarms(): PersistedFarmWorkspace | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedFarmWorkspace>;
    if (!Array.isArray(parsed.plots)) return null;
    return {
      plots: parsed.plots,
      activePlotId: typeof parsed.activePlotId === 'string' ? parsed.activePlotId : null,
      activeSectionId: typeof parsed.activeSectionId === 'string' ? parsed.activeSectionId : null,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function savePersistedFarms(workspace: {
  plots: FarmPlot[];
  activePlotId: string | null;
  activeSectionId: string | null;
}): string {
  const savedAt = new Date().toISOString();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const payload: PersistedFarmWorkspace = {
        plots: workspace.plots,
        activePlotId: workspace.activePlotId,
        activeSectionId: workspace.activeSectionId,
        savedAt,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota issues cleanly
    }
  }
  return savedAt;
}
