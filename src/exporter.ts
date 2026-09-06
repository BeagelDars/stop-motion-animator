import type { Timeline } from './timeline';

export interface ExportProgress {
  current: number;
  total: number;
  percent: number;
}

export class VideoExporter {
  private timeline: Timeline;

  constructor(timeline: Timeline) {
    this.timeline = timeline;
  }

  public getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  }

  /**
   * Exports the frames into a video Blob
   * @param loops Number of times to loop the animation (default: enough to make at least 2 seconds if short)
   * @param onProgress Callback for progress percentage
   */
  public async exportVideo(
    loops = 1,
    onProgress?: (p: ExportProgress) => void
  ): Promise<{ blob: Blob; url: string; mimeType: string; filename: string }> {
    const { width, height, fps } = this.timeline.settings;
    const frames = this.timeline.frames;

    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    const mimeType = this.getSupportedMimeType();
    if (!mimeType) {
      throw new Error('Video recording is not supported in this browser');
    }

    // Determine loop count so short animations are watchable
    const minDurationSec = 2.0;
    const durationPerLoop = frames.length / fps;
    const calculatedLoops = Math.max(loops, Math.ceil(minDurationSec / durationPerLoop));

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d')!;

    // Initial fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const stream = exportCanvas.captureStream(fps);
    const recordedChunks: Blob[] = [];

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 4_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const completionPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType.split(';')[0] });
        resolve(blob);
      };
      recorder.onerror = (e) => reject(e);
    });

    recorder.start(100);

    const frameDuration = 1000 / fps;
    const totalFramesToRender = frames.length * calculatedLoops;
    let renderedCount = 0;

    for (let l = 0; l < calculatedLoops; l++) {
      for (let i = 0; i < frames.length; i++) {
        // Draw frame onto pure white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(frames[i].canvas, 0, 0);

        renderedCount++;
        if (onProgress) {
          onProgress({
            current: renderedCount,
            total: totalFramesToRender,
            percent: Math.round((renderedCount / totalFramesToRender) * 100),
          });
        }

        // Wait for frame duration
        await new Promise((resolve) => setTimeout(resolve, frameDuration));
      }
    }

    // Give the recorder a fraction of a second to flush the last frame
    await new Promise((resolve) => setTimeout(resolve, 200));
    recorder.stop();

    const blob = await completionPromise;
    const isMp4 = mimeType.includes('mp4');
    const extension = isMp4 ? 'mp4' : 'webm';
    const filename = `stopmotion_${Date.now()}.${extension}`;
    const url = URL.createObjectURL(blob);

    return { blob, url, mimeType, filename };
  }
}
