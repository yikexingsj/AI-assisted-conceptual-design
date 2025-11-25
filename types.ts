
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TEXT_CREATIVE = 'TEXT_CREATIVE',
  IMAGE_CREATIVE = 'IMAGE_CREATIVE',
  IMAGE_EDIT = 'IMAGE_EDIT',
  ANIMATION = 'ANIMATION',
  THREED_MODEL = 'THREED_MODEL',
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
  type: 'image' | 'text' | 'video';
  url?: string;
  content?: string;
  timestamp: number;
  prompt: string;
}

export interface User {
  username: string;
  password?: string; // In a real app, never store plain text passwords
  credits: number;
  isPro: boolean;
  planName?: string;
}

export interface CostAnalysisData {
  type: 'new' | 'renovation';
  aboveGroundArea: string;
  undergroundArea: string;
  floors: string;
  structure: string;
  facade: string;
  renovationScope: string;
  images?: string[]; // Array of base64 image strings
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
