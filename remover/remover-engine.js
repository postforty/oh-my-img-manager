/**
 * RemoverEngine - High-performance HTML5 Canvas image segmentation and pixel manipulation engine.
 */
class RemoverEngine {
  /**
   * Loads an Image or File object into an ImageBitmap or HTMLImageElement
   */
  static async loadImage(source) {
    if (source instanceof ImageBitmap || source instanceof HTMLImageElement) {
      return source;
    }
    if (source instanceof Blob || source instanceof File) {
      if (typeof createImageBitmap === "function") {
        try {
          return await createImageBitmap(source);
        } catch (e) {
          // Fallback to Image element if createImageBitmap fails
        }
      }
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(source);
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });
    }
    if (typeof source === "string") {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = source;
      });
    }
    throw new Error("Unsupported image source type");
  }

  /**
   * Creates a fresh canvas copying the source image
   */
  static createCanvasFromSource(source) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  /**
   * Clones an existing canvas
   */
  static cloneCanvas(sourceCanvas) {
    const canvas = document.createElement("canvas");
    canvas.width = sourceCanvas.width;
    canvas.height = sourceCanvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(sourceCanvas, 0, 0);
    return canvas;
  }

  /**
   * 1. Solid / Chroma Key Color Background Removal (Pure Canvas 2D)
   * Calculates Euclidean RGB color distance and applies edge feathering.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {Object} options
   *   targetColor: [r, g, b]
   *   tolerance: 0 - 150
   *   feather: 0 - 20 (px smoothing)
   *   contiguous: boolean (flood fill from edges vs global replace)
   *   startX, startY: optional coordinates for flood fill
   */
  static removeSolidColor(canvas, options = {}) {
    const {
      targetColor = [255, 255, 255],
      tolerance = 30,
      feather = 2,
      contiguous = false,
      startX = 0,
      startY = 0,
    } = options;

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const [tr, tg, tb] = targetColor;

    const colorDist = (r, g, b) => {
      return Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2);
    };

    const featherRange = Math.max(1, feather * 8);

    if (!contiguous) {
      // Global color replacement
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Already transparent
        const dist = colorDist(data[i], data[i + 1], data[i + 2]);

        if (dist <= tolerance) {
          data[i + 3] = 0;
        } else if (dist < tolerance + featherRange) {
          const factor = (dist - tolerance) / featherRange;
          data[i + 3] = Math.round(data[i + 3] * factor);
        }
      }
    } else {
      // Contiguous Flood Fill (BFS) starting from given point
      const visited = new Uint8Array(width * height);
      const queue = [startY * width + startX];
      visited[startY * width + startX] = 1;

      while (queue.length > 0) {
        const idx = queue.pop();
        const px = idx % width;
        const py = Math.floor(idx / width);
        const pIdx = idx * 4;

        const dist = colorDist(data[pIdx], data[pIdx + 1], data[pIdx + 2]);

        if (dist <= tolerance) {
          data[pIdx + 3] = 0;

          // Check 4 neighbors
          const neighbors = [
            px > 0 ? idx - 1 : -1,
            px < width - 1 ? idx + 1 : -1,
            py > 0 ? idx - width : -1,
            py < height - 1 ? idx + width : -1,
          ];

          for (const n of neighbors) {
            if (n !== -1 && !visited[n]) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        } else if (dist < tolerance + featherRange) {
          const factor = (dist - tolerance) / featherRange;
          data[pIdx + 3] = Math.min(data[pIdx + 3], Math.round(data[pIdx + 3] * factor));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * 2. Applies an Alpha Mask (from AI model or Uint8ClampedArray) to the source canvas
   *
   * @param {HTMLCanvasElement} targetCanvas - Target canvas containing original RGB image
   * @param {ImageData|Uint8ClampedArray|HTMLCanvasElement} maskData - Grayscale/Alpha mask where 255=foreground, 0=background
   */
  static applyAlphaMask(targetCanvas, maskData, maskWidth = null, maskHeight = null, sourceOriginalCanvas = null) {
    const width = targetCanvas.width;
    const height = targetCanvas.height;
    const ctx = targetCanvas.getContext("2d", { willReadFrequently: true });
    
    // Always fetch pristine original RGB pixels to prevent color distortion/degradation
    const srcCanvas = sourceOriginalCanvas || targetCanvas;
    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
    const imgData = srcCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let maskCanvas = null;

    if (maskData instanceof HTMLCanvasElement) {
      maskCanvas = maskData;
    } else if (maskData instanceof ImageData) {
      maskCanvas = document.createElement("canvas");
      maskCanvas.width = maskData.width;
      maskCanvas.height = maskData.height;
      maskCanvas.getContext("2d").putImageData(maskData, 0, 0);
    } else if (maskData instanceof Uint8ClampedArray || maskData instanceof Uint8Array || ArrayBuffer.isView(maskData)) {
      const mW = maskWidth || width;
      const mH = maskHeight || height;
      const isSingleChannel = maskData.length === mW * mH;

      maskCanvas = document.createElement("canvas");
      maskCanvas.width = mW;
      maskCanvas.height = mH;
      const mCtx = maskCanvas.getContext("2d");
      const mImgData = mCtx.createImageData(mW, mH);
      const mData = mImgData.data;

      for (let i = 0; i < mW * mH; i++) {
        const val = isSingleChannel ? maskData[i] : maskData[i * 4];
        mData[i * 4] = val;
        mData[i * 4 + 1] = val;
        mData[i * 4 + 2] = val;
        mData[i * 4 + 3] = val; // Store mask in alpha & RGB
      }
      mCtx.putImageData(mImgData, 0, 0);
    }

    if (maskCanvas) {
      // Create a full-size mask canvas to match target dimensions
      const scaledMaskCanvas = document.createElement("canvas");
      scaledMaskCanvas.width = width;
      scaledMaskCanvas.height = height;
      const sCtx = scaledMaskCanvas.getContext("2d", { willReadFrequently: true });
      sCtx.drawImage(maskCanvas, 0, 0, width, height);

      const scaledMaskData = sCtx.getImageData(0, 0, width, height).data;
      for (let i = 0; i < data.length; i += 4) {
        // Apply mask value directly as alpha channel over pristine original RGB
        // Reference: addyosmani/bg-remove - pixelData.data[4 * i + 3] = maskData[i]
        data[i + 3] = scaledMaskData[i]; // R channel value (0=transparent, 255=opaque)
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return targetCanvas;
  }

  /**
   * 3. Manual Retouch Brush (Erase or Restore from original)
   *
   * @param {HTMLCanvasElement} currentCanvas - Active editing canvas
   * @param {HTMLCanvasElement} originalCanvas - Pristine original canvas
   * @param {number} x - Center X on canvas coordinate
   * @param {number} y - Center Y on canvas coordinate
   * @param {Object} brushOptions - { size: 20, hardness: 0.8, mode: 'erase' | 'restore' }
   */
  static applyBrushStroke(currentCanvas, originalCanvas, x, y, brushOptions = {}) {
    const { size = 30, hardness = 0.5, mode = "erase" } = brushOptions;
    const radius = Math.max(1, Math.round(size / 2));
    const width = currentCanvas.width;
    const height = currentCanvas.height;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(height - 1, Math.ceil(y + radius));

    const patchW = maxX - minX + 1;
    const patchH = maxY - minY + 1;
    if (patchW <= 0 || patchH <= 0) return;

    const curCtx = currentCanvas.getContext("2d", { willReadFrequently: true });
    const curImgData = curCtx.getImageData(minX, minY, patchW, patchH);
    const curData = curImgData.data;

    let origData = null;
    if (mode === "restore" && originalCanvas) {
      const origCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
      origData = origCtx.getImageData(minX, minY, patchW, patchH).data;
    }

    const innerRadius = radius * hardness;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
        if (dist > radius) continue;

        const patchIdx = ((py - minY) * patchW + (px - minX)) * 4;

        // Calculate brush falloff factor (1 at center, 0 at edge)
        let brushFactor = 1.0;
        if (dist > innerRadius) {
          brushFactor = 1.0 - (dist - innerRadius) / (radius - innerRadius);
          brushFactor = Math.max(0, Math.min(1, brushFactor));
        }

        if (mode === "erase") {
          // Reduce alpha
          curData[patchIdx + 3] = Math.round(curData[patchIdx + 3] * (1 - brushFactor));
        } else if (mode === "restore" && origData) {
          // Restore original RGB & Alpha
          const targetAlpha = origData[patchIdx + 3];
          const currentAlpha = curData[patchIdx + 3];
          const newAlpha = Math.round(currentAlpha + (targetAlpha - currentAlpha) * brushFactor);

          curData[patchIdx] = origData[patchIdx];
          curData[patchIdx + 1] = origData[patchIdx + 1];
          curData[patchIdx + 2] = origData[patchIdx + 2];
          curData[patchIdx + 3] = newAlpha;
        }
      }
    }

    curCtx.putImageData(curImgData, minX, minY);
  }

  /**
   * 4. Renders composed canvas with background color option
   *
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {string} bgOption - 'transparent' | '#ffffff' | '#000000' | custom hex
   */
  static renderWithBackground(sourceCanvas, bgOption = "transparent") {
    if (bgOption === "transparent") {
      return sourceCanvas;
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = sourceCanvas.width;
    outCanvas.height = sourceCanvas.height;
    const ctx = outCanvas.getContext("2d");

    ctx.fillStyle = bgOption;
    ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    return outCanvas;
  }

  /**
   * 5. Converts canvas to Blob
   */
  static async toBlob(canvas, format = "image/png", quality = 1.0) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        format,
        quality
      );
    });
  }

  /**
   * 6. Copies canvas as transparent PNG to system clipboard
   */
  static async copyToClipboard(canvas) {
    const blob = await this.toBlob(canvas, "image/png");
    if (navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
      return true;
    }
    throw new Error("Clipboard API not supported in this browser context");
  }
}

/**
 * Canvas History Manager for Undo / Redo
 */
class HistoryManager {
  constructor(maxSteps = 20) {
    this.maxSteps = maxSteps;
    this.undoStack = [];
    this.redoStack = [];
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  pushState(canvas) {
    const snapshot = RemoverEngine.cloneCanvas(canvas);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxSteps) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(currentCanvas) {
    if (!this.canUndo()) return null;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    return RemoverEngine.cloneCanvas(prev);
  }

  redo(currentCanvas) {
    if (!this.canRedo()) return null;
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    return RemoverEngine.cloneCanvas(next);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RemoverEngine, HistoryManager };
}
