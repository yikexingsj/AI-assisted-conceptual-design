export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TEXT_CREATIVE = 'TEXT_CREATIVE',
  IMAGE_CREATIVE = 'IMAGE_CREATIVE',
  IMAGE_EDIT = 'IMAGE_EDIT',
  ANIMATION = 'ANIMATION',
  GALLERY = 'GALLERY',
  COST_ANALYSIS = 'COST_ANALYSIS'
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  WIDE = '16:9',
  TALL = '9:16'
}

export interface GeneratedItem {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  content?: string;
  timestamp: number;
  prompt: string;
}

export interface CostAnalysisData {
  type: 'new' | 'renovation';
  aboveGroundArea?: number;
  underGroundArea?: number;
  floors?: number;
  structure?: string;
  facade?: string;
  renovationDetails?: string;
}

// Augment the global Window interface
// AIStudio is defined in the global scope to allow interface merging if it exists elsewhere
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
