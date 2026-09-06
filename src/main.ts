import './style.css';
import { Timeline } from './timeline';
import { DrawingEngine } from './drawing';
import { AnimationPlayer } from './player';
import { VideoExporter } from './exporter';
import { loadBouncingBallDemo } from './demo';
import { icons } from './icons';

const app = document.querySelector<HTMLDivElement>('#app')!;

const timeline = new Timeline();

// Setup UI HTML skeleton
app.innerHTML = `
  <header class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      Stop Motion
    </div>

    <!-- Drawing & Canvas Tools -->
    <div class="toolbar-group">
      <button id="toolPen" class="tool-btn active" title="Pen (P)">${icons.pen}</button>
      <button id="toolEraser" class="tool-btn" title="Eraser (E)">${icons.eraser}</button>
      
      <div class="divider"></div>

      <div class="size-select-wrapper">
        <input id="brushSizeSlider" class="size-slider" type="range" min="1" max="40" value="4" title="Brush Size" />
        <span id="brushSizeVal" class="size-indicator">4px</span>
      </div>

      <div class="divider"></div>

      <div class="color-swatch-list" id="swatchList">
        <div class="color-swatch active" data-color="#18181b" style="background: #18181b" title="Black"></div>
        <div class="color-swatch" data-color="#ef4444" style="background: #ef4444" title="Red"></div>
        <div class="color-swatch" data-color="#2563eb" style="background: #2563eb" title="Blue"></div>
        <div class="color-swatch" data-color="#10b981" style="background: #10b981" title="Green"></div>
        <div class="color-swatch" data-color="#f59e0b" style="background: #f59e0b" title="Amber"></div>
        <div class="color-picker-wrapper" title="Custom Color">
          <input type="color" id="nativeColorPicker" class="color-input" value="#18181b" />
        </div>
      </div>

      <div class="divider"></div>

      <button id="btnUndo" class="tool-btn" title="Undo (Ctrl+Z)">${icons.undo}</button>
      <button id="btnRedo" class="tool-btn" title="Redo (Ctrl+Y)">${icons.redo}</button>
      <button id="btnOnionSkin" class="tool-btn active" title="Toggle Onion Skin (O)">${icons.onionSkin}</button>
      <button id="btnClearCanvas" class="tool-btn" title="Clear Current Frame">${icons.trash}</button>
    </div>

    <!-- Actions Right -->
    <div class="actions-right">
      <div class="fps-control" title="Playback Speed">
        <button id="fpsDown" class="fps-btn">−</button>
        <span id="fpsDisplay" class="fps-val">8 FPS</span>
        <button id="fpsUp" class="fps-btn">+</button>
      </div>

      <button id="btnPlay" class="action-btn" title="Play / Pause (Space)">
        <span id="playIconContainer">${icons.play}</span>
      </button>

      <button id="btnDemo" class="action-btn" title="Load Sample Demo">
        ${icons.sparkles}
        <span>Demo</span>
      </button>

      <button id="btnExport" class="action-btn primary" title="Export as Video">
        ${icons.download}
        <span>Export</span>
      </button>
    </div>
  </header>

  <main class="canvas-stage">
    <div class="canvas-card">
      <div id="playbackBadge" class="canvas-badge">Playing</div>
      <canvas id="drawingCanvas" width="800" height="600"></canvas>
    </div>
  </main>

  <footer class="timeline-bar">
    <div class="timeline-controls">
      <button id="btnPrevFrame" class="tool-btn" title="Previous Frame (Left Arrow)">${icons.chevronLeft}</button>
      <span id="frameCounter" class="frame-count-badge">1 / 1</span>
      <button id="btnNextFrame" class="tool-btn" title="Next Frame (Right Arrow)">${icons.chevronRight}</button>

      <div class="divider"></div>

      <button id="btnAddFrame" class="action-btn" title="Add Next Blank Frame (N)">
        ${icons.plus}
        <span>Next Frame</span>
      </button>

      <button id="btnDuplicateFrame" class="tool-btn" title="Duplicate Frame (D)">${icons.copy}</button>
      <button id="btnDeleteFrame" class="tool-btn" title="Delete Frame">${icons.trash}</button>
    </div>

    <div id="timelineReel" class="timeline-reel"></div>
  </footer>

  <!-- Video Export Modal -->
  <div id="exportModal" class="modal-backdrop">
    <div class="modal-dialog">
      <div class="modal-header">
        <div class="modal-title">Export Video</div>
        <button id="btnCloseModal" class="modal-close-btn">${icons.close}</button>
      </div>
      <div class="modal-body">
        <div id="exportProgressContainer" style="display: none;">
          <div class="progress-bar-bg">
            <div id="exportProgressBar" class="progress-bar-fill"></div>
          </div>
          <div id="exportProgressText" class="progress-text" style="margin-top: 8px;">Rendering frames... 0%</div>
        </div>
        <video id="exportVideoPlayer" class="video-preview" controls loop style="display: none;"></video>
      </div>
      <div class="modal-footer">
        <button id="btnCancelExport" class="action-btn">Close</button>
        <a id="btnDownloadVideo" class="action-btn primary" style="display: none; text-decoration: none;" download="stopmotion.webm">
          ${icons.download}
          <span>Download</span>
        </a>
      </div>
    </div>
  </div>
`;

// Element references
const canvas = document.querySelector<HTMLCanvasElement>('#drawingCanvas')!;
const drawingEngine = new DrawingEngine(canvas, timeline);
const videoExporter = new VideoExporter(timeline);

const toolPen = document.querySelector<HTMLButtonElement>('#toolPen')!;
const toolEraser = document.querySelector<HTMLButtonElement>('#toolEraser')!;
const brushSizeSlider = document.querySelector<HTMLInputElement>('#brushSizeSlider')!;
const brushSizeVal = document.querySelector<HTMLSpanElement>('#brushSizeVal')!;
const swatchList = document.querySelector<HTMLDivElement>('#swatchList')!;
const nativeColorPicker = document.querySelector<HTMLInputElement>('#nativeColorPicker')!;
const btnUndo = document.querySelector<HTMLButtonElement>('#btnUndo')!;
const btnRedo = document.querySelector<HTMLButtonElement>('#btnRedo')!;
const btnOnionSkin = document.querySelector<HTMLButtonElement>('#btnOnionSkin')!;
const btnClearCanvas = document.querySelector<HTMLButtonElement>('#btnClearCanvas')!;

const fpsDown = document.querySelector<HTMLButtonElement>('#fpsDown')!;
const fpsUp = document.querySelector<HTMLButtonElement>('#fpsUp')!;
const fpsDisplay = document.querySelector<HTMLSpanElement>('#fpsDisplay')!;
const btnPlay = document.querySelector<HTMLButtonElement>('#btnPlay')!;
const playIconContainer = document.querySelector<HTMLSpanElement>('#playIconContainer')!;
const btnDemo = document.querySelector<HTMLButtonElement>('#btnDemo')!;
const btnExport = document.querySelector<HTMLButtonElement>('#btnExport')!;
const playbackBadge = document.querySelector<HTMLDivElement>('#playbackBadge')!;

const btnPrevFrame = document.querySelector<HTMLButtonElement>('#btnPrevFrame')!;
const btnNextFrame = document.querySelector<HTMLButtonElement>('#btnNextFrame')!;
const frameCounter = document.querySelector<HTMLSpanElement>('#frameCounter')!;
const btnAddFrame = document.querySelector<HTMLButtonElement>('#btnAddFrame')!;
const btnDuplicateFrame = document.querySelector<HTMLButtonElement>('#btnDuplicateFrame')!;
const btnDeleteFrame = document.querySelector<HTMLButtonElement>('#btnDeleteFrame')!;
const timelineReel = document.querySelector<HTMLDivElement>('#timelineReel')!;

// Modal elements
const exportModal = document.querySelector<HTMLDivElement>('#exportModal')!;
const btnCloseModal = document.querySelector<HTMLButtonElement>('#btnCloseModal')!;
const btnCancelExport = document.querySelector<HTMLButtonElement>('#btnCancelExport')!;
const exportProgressContainer = document.querySelector<HTMLDivElement>('#exportProgressContainer')!;
const exportProgressBar = document.querySelector<HTMLDivElement>('#exportProgressBar')!;
const exportProgressText = document.querySelector<HTMLDivElement>('#exportProgressText')!;
const exportVideoPlayer = document.querySelector<HTMLVideoElement>('#exportVideoPlayer')!;
const btnDownloadVideo = document.querySelector<HTMLAnchorElement>('#btnDownloadVideo')!;

// Player instance
let activePlaybackIndex = -1;
const player = new AnimationPlayer(
  timeline,
  drawingEngine,
  (idx) => {
    activePlaybackIndex = idx;
    updateTimelineUI();
  },
  (isPlaying) => {
    if (isPlaying) {
      playIconContainer.innerHTML = icons.pause;
      btnPlay.classList.add('primary');
      playbackBadge.classList.add('visible');
    } else {
      playIconContainer.innerHTML = icons.play;
      btnPlay.classList.remove('primary');
      playbackBadge.classList.remove('visible');
      activePlaybackIndex = -1;
      updateTimelineUI();
    }
  }
);

// Load demo bouncing ball animation at launch so user has immediate feedback
loadBouncingBallDemo(timeline);
drawingEngine.render();

// Tool state handler
function setTool(tool: 'pen' | 'eraser') {
  drawingEngine.tool = tool;
  if (tool === 'pen') {
    toolPen.classList.add('active');
    toolEraser.classList.remove('active');
    canvas.style.cursor = 'crosshair';
  } else {
    toolEraser.classList.add('active');
    toolPen.classList.remove('active');
    canvas.style.cursor = 'cell';
  }
}

toolPen.addEventListener('click', () => setTool('pen'));
toolEraser.addEventListener('click', () => setTool('eraser'));

// Brush Size
brushSizeSlider.addEventListener('input', () => {
  const size = parseInt(brushSizeSlider.value, 10);
  drawingEngine.strokeWidth = size;
  brushSizeVal.textContent = `${size}px`;
});

// Color Selection
function setColor(color: string) {
  drawingEngine.strokeColor = color;
  nativeColorPicker.value = color;
  setTool('pen');

  swatchList.querySelectorAll('.color-swatch').forEach((swatch) => {
    const el = swatch as HTMLElement;
    if (el.dataset.color?.toLowerCase() === color.toLowerCase()) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

swatchList.addEventListener('click', (e) => {
  const target = (e.target as HTMLElement).closest('.color-swatch') as HTMLElement;
  if (target && target.dataset.color) {
    setColor(target.dataset.color);
  }
});

nativeColorPicker.addEventListener('input', () => {
  setColor(nativeColorPicker.value);
});

// Undo / Redo / Clear
btnUndo.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.undo();
  drawingEngine.render();
});

btnRedo.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.redo();
  drawingEngine.render();
});

btnClearCanvas.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.clearCurrentFrame();
  drawingEngine.render();
});

// Onion Skin
btnOnionSkin.addEventListener('click', () => {
  timeline.settings.onionSkin = !timeline.settings.onionSkin;
  btnOnionSkin.classList.toggle('active', timeline.settings.onionSkin);
  drawingEngine.render();
});

// FPS Controls
function setFps(fps: number) {
  const clamped = Math.max(1, Math.min(30, fps));
  timeline.settings.fps = clamped;
  fpsDisplay.textContent = `${clamped} FPS`;
}

fpsDown.addEventListener('click', () => setFps(timeline.settings.fps - 1));
fpsUp.addEventListener('click', () => setFps(timeline.settings.fps + 1));

// Play / Pause
function togglePlayback() {
  player.toggle();
}

btnPlay.addEventListener('click', togglePlayback);

// Load Demo
btnDemo.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  loadBouncingBallDemo(timeline);
  drawingEngine.render();
});

// Frame Management
btnPrevFrame.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.prevFrame();
  drawingEngine.render();
});

btnNextFrame.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.nextFrame();
  drawingEngine.render();
});

btnAddFrame.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.addFrame();
  drawingEngine.render();
  scrollTimelineToEnd();
});

btnDuplicateFrame.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.duplicateCurrentFrame();
  drawingEngine.render();
  scrollTimelineToEnd();
});

btnDeleteFrame.addEventListener('click', () => {
  if (player.isPlaying) player.stop();
  timeline.deleteFrame();
  drawingEngine.render();
});

function scrollTimelineToEnd() {
  setTimeout(() => {
    timelineReel.scrollTo({
      left: timelineReel.scrollWidth,
      behavior: 'smooth',
    });
  }, 50);
}

// Timeline UI Updates
function updateTimelineUI() {
  frameCounter.textContent = `${timeline.activeIndex + 1} / ${timeline.frames.length}`;
  btnPrevFrame.disabled = timeline.activeIndex === 0;
  btnDeleteFrame.disabled = timeline.frames.length <= 1;

  timelineReel.innerHTML = '';
  timeline.frames.forEach((frame, idx) => {
    const card = document.createElement('div');
    card.className = 'frame-thumbnail-card';
    if (player.isPlaying && activePlaybackIndex === idx) {
      card.classList.add('active-playback');
    } else if (!player.isPlaying && idx === timeline.activeIndex) {
      card.classList.add('active');
    }

    const img = document.createElement('img');
    img.className = 'thumb-img';
    img.src = frame.thumbnail || '';
    img.alt = `Frame ${idx + 1}`;

    const num = document.createElement('span');
    num.className = 'thumb-index';
    num.textContent = `${idx + 1}`;

    card.appendChild(img);
    card.appendChild(num);

    card.addEventListener('click', () => {
      if (player.isPlaying) player.stop();
      timeline.goToFrame(idx);
      drawingEngine.render();
    });

    timelineReel.appendChild(card);
  });
}

timeline.subscribe(() => {
  updateTimelineUI();
});

// Video Export
let currentExportUrl: string | null = null;

function closeModal() {
  exportModal.classList.remove('open');
  if (exportVideoPlayer.src) {
    exportVideoPlayer.pause();
    exportVideoPlayer.src = '';
  }
  if (currentExportUrl) {
    URL.revokeObjectURL(currentExportUrl);
    currentExportUrl = null;
  }
}

btnCloseModal.addEventListener('click', closeModal);
btnCancelExport.addEventListener('click', closeModal);

btnExport.addEventListener('click', async () => {
  if (player.isPlaying) player.stop();

  exportModal.classList.add('open');
  exportProgressContainer.style.display = 'block';
  exportVideoPlayer.style.display = 'none';
  btnDownloadVideo.style.display = 'none';
  exportProgressBar.style.width = '0%';
  exportProgressText.textContent = 'Rendering video... 0%';

  try {
    const result = await videoExporter.exportVideo(1, (p) => {
      exportProgressBar.style.width = `${p.percent}%`;
      exportProgressText.textContent = `Rendering video... ${p.percent}%`;
    });

    currentExportUrl = result.url;
    exportProgressContainer.style.display = 'none';

    exportVideoPlayer.src = result.url;
    exportVideoPlayer.style.display = 'block';
    exportVideoPlayer.play();

    btnDownloadVideo.href = result.url;
    btnDownloadVideo.download = result.filename;
    btnDownloadVideo.style.display = 'inline-flex';
  } catch (err: any) {
    exportProgressText.textContent = `Export failed: ${err.message || err}`;
  }
});

// Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  // If in text input, don't trigger shortcuts
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlayback();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (player.isPlaying) player.stop();
    timeline.nextFrame();
    drawingEngine.render();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    if (player.isPlaying) player.stop();
    timeline.prevFrame();
    drawingEngine.render();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (player.isPlaying) player.stop();
    if (e.shiftKey) {
      timeline.redo();
    } else {
      timeline.undo();
    }
    drawingEngine.render();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    if (player.isPlaying) player.stop();
    timeline.redo();
    drawingEngine.render();
  } else if (e.key.toLowerCase() === 'n') {
    if (player.isPlaying) player.stop();
    timeline.addFrame();
    drawingEngine.render();
    scrollTimelineToEnd();
  } else if (e.key.toLowerCase() === 'd') {
    if (player.isPlaying) player.stop();
    timeline.duplicateCurrentFrame();
    drawingEngine.render();
    scrollTimelineToEnd();
  } else if (e.key.toLowerCase() === 'p' || e.key.toLowerCase() === 'b') {
    setTool('pen');
  } else if (e.key.toLowerCase() === 'e') {
    setTool('eraser');
  } else if (e.key.toLowerCase() === 'o') {
    timeline.settings.onionSkin = !timeline.settings.onionSkin;
    btnOnionSkin.classList.toggle('active', timeline.settings.onionSkin);
    drawingEngine.render();
  }
});

// Initial update
updateTimelineUI();
