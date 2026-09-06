import type { Frame, AnimationSettings } from './types';

export class Timeline {
  public frames: Frame[] = [];
  public activeIndex = 0;
  public settings: AnimationSettings = {
    fps: 8,
    width: 800,
    height: 600,
    onionSkin: true,
    onionSkinOpacity: 0.35,
  };

  private listeners: Array<() => void> = [];

  constructor() {
    this.addFrame();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public notify() {
    this.listeners.forEach((l) => l());
  }

  public get currentFrame(): Frame {
    return this.frames[this.activeIndex];
  }

  public get previousFrame(): Frame | null {
    if (this.activeIndex > 0) {
      return this.frames[this.activeIndex - 1];
    }
    return null;
  }

  public createNewCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = this.settings.width;
    canvas.height = this.settings.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return { canvas, ctx };
  }

  public addFrame(afterIndex: number = this.activeIndex): Frame {
    const { canvas, ctx } = this.createNewCanvas();
    const frame: Frame = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      canvas,
      ctx,
      thumbnail: '',
      undoStack: [],
      redoStack: [],
    };
    this.updateThumbnail(frame);

    if (this.frames.length === 0) {
      this.frames.push(frame);
      this.activeIndex = 0;
    } else {
      const insertAt = afterIndex + 1;
      this.frames.splice(insertAt, 0, frame);
      this.activeIndex = insertAt;
    }

    this.notify();
    return frame;
  }

  public duplicateCurrentFrame(): Frame {
    const current = this.currentFrame;
    const { canvas, ctx } = this.createNewCanvas();
    ctx.drawImage(current.canvas, 0, 0);

    const frame: Frame = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      canvas,
      ctx,
      thumbnail: '',
      undoStack: [ctx.getImageData(0, 0, this.settings.width, this.settings.height)],
      redoStack: [],
    };
    this.updateThumbnail(frame);

    const insertAt = this.activeIndex + 1;
    this.frames.splice(insertAt, 0, frame);
    this.activeIndex = insertAt;

    this.notify();
    return frame;
  }

  public deleteFrame(index: number = this.activeIndex): boolean {
    if (this.frames.length <= 1) {
      // Keep at least 1 frame; clear it instead
      this.clearCurrentFrame();
      return false;
    }

    this.frames.splice(index, 1);
    if (this.activeIndex >= this.frames.length) {
      this.activeIndex = this.frames.length - 1;
    }
    this.notify();
    return true;
  }

  public clearCurrentFrame() {
    const frame = this.currentFrame;
    this.saveUndo(frame);
    frame.ctx.clearRect(0, 0, this.settings.width, this.settings.height);
    this.updateThumbnail(frame);
    this.notify();
  }

  public goToFrame(index: number) {
    if (index >= 0 && index < this.frames.length && index !== this.activeIndex) {
      this.activeIndex = index;
      this.notify();
    }
  }

  public nextFrame() {
    if (this.activeIndex < this.frames.length - 1) {
      this.activeIndex++;
      this.notify();
    } else {
      // At the end, pressing next creates a new frame
      this.addFrame();
    }
  }

  public prevFrame() {
    if (this.activeIndex > 0) {
      this.activeIndex--;
      this.notify();
    }
  }

  public moveFrame(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= this.frames.length ||
      toIndex < 0 ||
      toIndex >= this.frames.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const [moved] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, moved);
    this.activeIndex = toIndex;
    this.notify();
  }

  public updateThumbnail(frame: Frame) {
    // Generate small thumbnail on an offscreen miniature canvas
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 80;
    thumbCanvas.height = 60;
    const tCtx = thumbCanvas.getContext('2d')!;
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, 80, 60);
    tCtx.drawImage(frame.canvas, 0, 0, 80, 60);
    frame.thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.8);
  }

  public saveUndo(frame: Frame = this.currentFrame) {
    const snapshot = frame.ctx.getImageData(0, 0, this.settings.width, this.settings.height);
    frame.undoStack.push(snapshot);
    if (frame.undoStack.length > 25) {
      frame.undoStack.shift();
    }
    frame.redoStack = [];
  }

  public undo(frame: Frame = this.currentFrame): boolean {
    if (frame.undoStack.length === 0) return false;
    const currentSnapshot = frame.ctx.getImageData(0, 0, this.settings.width, this.settings.height);
    frame.redoStack.push(currentSnapshot);
    const prev = frame.undoStack.pop()!;
    frame.ctx.putImageData(prev, 0, 0);
    this.updateThumbnail(frame);
    this.notify();
    return true;
  }

  public redo(frame: Frame = this.currentFrame): boolean {
    if (frame.redoStack.length === 0) return false;
    const currentSnapshot = frame.ctx.getImageData(0, 0, this.settings.width, this.settings.height);
    frame.undoStack.push(currentSnapshot);
    const next = frame.redoStack.pop()!;
    frame.ctx.putImageData(next, 0, 0);
    this.updateThumbnail(frame);
    this.notify();
    return true;
  }
}
