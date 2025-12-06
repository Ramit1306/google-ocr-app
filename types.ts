export interface ExtractedData {
  id: string;
  text: string;
  timestamp: number;
  thumbnail?: string; // Base64 of the cropped area
  source: 'full' | 'selection';
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// Re-export specific types from library if needed, or define local shapes
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px';
}

export interface PercentCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: '%';
}

export type Crop = PixelCrop | PercentCrop;