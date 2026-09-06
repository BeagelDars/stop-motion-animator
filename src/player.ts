import type { Timeline } from './timeline';
import type { DrawingEngine } from './drawing';

export class AnimationPlayer {
  private timeline: Timeline;
  private drawingEngine: DrawingEngine;
  public isPlaying = false;
  private playIndex = 0;
  private timerId: number | null = null;
  public onFrameChange?: (index: number) => void;
  public onStateChange?: (isPlaying: boolean) => void;

  constructor(
    timeline: Timeline,
    drawingEngine: DrawingEngine,
    onFrameChange?: (index: number) => void,
    onStateChange?: (isPlaying: boolean) => void
  ) {
    this.timeline = timeline;
    this.drawingEngine = drawingEngine;
    this.onFrameChange = onFrameChange;
    this.onStateChange = onStateChange;
  }

  public toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  public play() {
    if (this.timeline.frames.length <= 1) {
      return;
    }
    this.isPlaying = true;
    this.playIndex = this.timeline.activeIndex;
    if (this.onStateChange) this.onStateChange(true);
    this.tick();
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.onStateChange) this.onStateChange(false);
    // Restore normal editing view with onion skinning
    this.drawingEngine.render();
    if (this.onFrameChange) {
      this.onFrameChange(this.timeline.activeIndex);
    }
  }

  private tick = () => {
    if (!this.isPlaying) return;

    const frame = this.timeline.frames[this.playIndex];
    if (frame) {
      this.drawingEngine.renderFrameOnly(frame.canvas);
      if (this.onFrameChange) {
        this.onFrameChange(this.playIndex);
      }
    }

    this.playIndex = (this.playIndex + 1) % this.timeline.frames.length;
    const interval = 1000 / Math.max(1, this.timeline.settings.fps);

    this.timerId = window.setTimeout(() => {
      this.tick();
    }, interval);
  };
}
