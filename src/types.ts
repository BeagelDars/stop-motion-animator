export type ToolMode = 'pen' | 'eraser';

export interface Frame {
  id: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  thumbnail: string;
  undoStack: ImageData[];
  redoStack: ImageData[];
}

export interface AnimationSettings {
  fps: number;
  width: number;
  height: number;
  onionSkin: boolean;
  onionSkinOpacity: number;
}
