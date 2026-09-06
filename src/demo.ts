import type { Timeline } from './timeline';

/**
 * Generates an 8-frame classic bouncing ball animation with squash and stretch
 * to demonstrate stop-motion physics right away.
 */
export function loadBouncingBallDemo(timeline: Timeline) {
  timeline.frames = [];
  const { width, height } = timeline.settings;

  // Ball states: [x, y, radiusX, radiusY, color]
  const states = [
    { x: 400, y: 140, rx: 28, ry: 28 }, // 1. Peak top
    { x: 400, y: 220, rx: 27, ry: 29 }, // 2. Falling
    { x: 400, y: 340, rx: 25, ry: 33 }, // 3. Fast stretch down
    { x: 400, y: 460, rx: 23, ry: 37 }, // 4. Pre-impact stretch
    { x: 400, y: 485, rx: 42, ry: 16 }, // 5. Squash on floor
    { x: 400, y: 440, rx: 24, ry: 35 }, // 6. Rebound stretch up
    { x: 400, y: 310, rx: 26, ry: 30 }, // 7. Decelerating up
    { x: 400, y: 200, rx: 28, ry: 28 }, // 8. Near peak
  ];

  states.forEach((s) => {
    const { canvas, ctx } = timeline.createNewCanvas();

    // Floor line
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(150, 495);
    ctx.lineTo(650, 495);
    ctx.stroke();

    // Ball
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(s.x - s.rx * 0.3, s.y - s.ry * 0.3, s.rx * 0.25, s.ry * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const frame = {
      id: 'f_' + Math.random().toString(36).substring(2, 9),
      canvas,
      ctx,
      thumbnail: '',
      undoStack: [ctx.getImageData(0, 0, width, height)],
      redoStack: [],
    };
    timeline.updateThumbnail(frame);
    timeline.frames.push(frame);
  });

  timeline.activeIndex = 0;
  timeline.settings.fps = 8;
  timeline.notify();
}
