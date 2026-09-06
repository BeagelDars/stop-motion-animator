import type { ToolMode } from './types';
import type { Timeline } from './timeline';

export class DrawingEngine {
  public tool: ToolMode = 'pen';
  public strokeColor: string = '#18181b';
  public strokeWidth: number = 4;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  // Viewport canvas shown in the UI
  private viewportCanvas: HTMLCanvasElement;
  private viewportCtx: CanvasRenderingContext2D;

  private timeline: Timeline;

  constructor(viewportCanvas: HTMLCanvasElement, timeline: Timeline) {
    this.viewportCanvas = viewportCanvas;
    this.viewportCtx = viewportCanvas.getContext('2d')!;
    this.timeline = timeline;

    this.viewportCanvas.width = this.timeline.settings.width;
    this.viewportCanvas.height = this.timeline.settings.height;

    this.setupEvents();
    this.render();
  }

  private setupEvents() {
    this.viewportCanvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  public destroy() {
    this.viewportCanvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  private getCoordinates(e: PointerEvent): { x: number; y: number } {
    const rect = this.viewportCanvas.getBoundingClientRect();
    const scaleX = this.viewportCanvas.width / rect.width;
    const scaleY = this.viewportCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return; // Only left click
    this.viewportCanvas.setPointerCapture(e.pointerId);

    const { x, y } = this.getCoordinates(e);
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;

    // Save undo state before modifying
    this.timeline.saveUndo(this.timeline.currentFrame);

    // Draw single dot if just clicked
    const ctx = this.timeline.currentFrame.ctx;
    ctx.save();
    if (this.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.beginPath();
      ctx.arc(x, y, this.strokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = this.strokeColor;
      ctx.beginPath();
      ctx.arc(x, y, this.strokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    this.render();
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(e);
    const ctx = this.timeline.currentFrame.ctx;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.strokeWidth;

    if (this.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.strokeColor;
    }

    ctx.beginPath();
    ctx.moveTo(this.lastX, this.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.restore();

    this.lastX = x;
    this.lastY = y;

    this.render();
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    try {
      this.viewportCanvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture already lost
    }

    this.timeline.updateThumbnail(this.timeline.currentFrame);
    this.timeline.notify();
    this.render();
  };

  /**
   * Renders the complete canvas viewport:
   * 1. Pure crisp white sheet
   * 2. Onion skin ghost of previous frame (if enabled)
   * 3. Current active frame drawing
   */
  public render() {
    const { width, height, onionSkin, onionSkinOpacity } = this.timeline.settings;
    const ctx = this.viewportCtx;

    // 1. Clear & draw crisp white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle paper grid pattern optional, but keeping pure minimalist white paper
    // 2. Onion skin (previous frame)
    if (onionSkin && this.timeline.previousFrame) {
      ctx.save();
      ctx.globalAlpha = onionSkinOpacity;
      // Draw previous frame
      ctx.drawImage(this.timeline.previousFrame.canvas, 0, 0);
      ctx.restore();
    }

    // 3. Current frame
    const current = this.timeline.currentFrame;
    if (current) {
      ctx.drawImage(current.canvas, 0, 0);
    }
  }

  /**
   * Renders just a specific frame (used during playback preview)
   */
  public renderFrameOnly(frame: CanvasImageSource) {
    const { width, height } = this.timeline.settings;
    const ctx = this.viewportCtx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(frame, 0, 0);
  }
}
