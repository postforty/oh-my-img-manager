/**
 * CropperEngine - High performance pure HTML5 Canvas image cropping and preview engine.
 */
class CropperEngine {
  /**
   * Calculates actual pixel coordinates from normalized ratios (0.0 - 1.0)
   */
  static calculateCoordinates(width, height, ratios) {
    const left = Math.max(0, Math.min(Math.round(width * ratios.left), width - 1));
    const top = Math.max(0, Math.min(Math.round(height * ratios.top), height - 1));
    const right = Math.max(left + 1, Math.min(Math.round(width * ratios.right), width));
    const bottom = Math.max(top + 1, Math.min(Math.round(height * ratios.bottom), height));

    return {
      sx: left,
      sy: top,
      sWidth: right - left,
      sHeight: bottom - top,
      left,
      top,
      right,
      bottom,
    };
  }

  /**
   * Loads an Image or File object into an ImageBitmap or HTMLImageElement
   */
  static async loadImage(source) {
    if (source instanceof ImageBitmap || source instanceof HTMLImageElement) {
      return source;
    }
    if (source instanceof Blob || source instanceof File) {
      if (typeof createImageBitmap === "function") {
        return await createImageBitmap(source);
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
    throw new Error("Unsupported image source");
  }

  /**
   * Renders the red bounding box and dimmed overlay on the preview canvas
   */
  static drawPreview(canvas, imgSource, ratios, options = {}) {
    const ctx = canvas.getContext("2d");
    const imgWidth = imgSource.width;
    const imgHeight = imgSource.height;

    // Set canvas dimensions
    canvas.width = imgWidth;
    canvas.height = imgHeight;

    // 1. Draw base original image
    ctx.drawImage(imgSource, 0, 0, imgWidth, imgHeight);

    const coords = this.calculateCoordinates(imgWidth, imgHeight, ratios);

    // 2. Draw semi-transparent dimming outside the active crop box
    ctx.fillStyle = options.dimColor || "rgba(0, 0, 0, 0.45)";
    // Top area
    ctx.fillRect(0, 0, imgWidth, coords.top);
    // Bottom area
    ctx.fillRect(0, coords.bottom, imgWidth, imgHeight - coords.bottom);
    // Left area (between top and bottom)
    ctx.fillRect(0, coords.top, coords.left, coords.sHeight);
    // Right area (between top and bottom)
    ctx.fillRect(coords.right, coords.top, imgWidth - coords.right, coords.sHeight);

    // 3. Draw bold red bounding box border
    ctx.strokeStyle = options.borderColor || "#ef4444";
    ctx.lineWidth = options.borderWidth || Math.max(4, Math.round(imgWidth / 250));
    ctx.strokeRect(coords.left, coords.top, coords.sWidth, coords.sHeight);

    // 4. Draw corner accent handles
    const handleSize = Math.max(12, Math.round(imgWidth / 80));
    ctx.fillStyle = options.borderColor || "#ef4444";
    // Top-left
    ctx.fillRect(coords.left - 2, coords.top - 2, handleSize, ctx.lineWidth);
    ctx.fillRect(coords.left - 2, coords.top - 2, ctx.lineWidth, handleSize);
    // Top-right
    ctx.fillRect(coords.right - handleSize + 2, coords.top - 2, handleSize, ctx.lineWidth);
    ctx.fillRect(coords.right - ctx.lineWidth + 2, coords.top - 2, ctx.lineWidth, handleSize);
    // Bottom-left
    ctx.fillRect(coords.left - 2, coords.bottom - ctx.lineWidth + 2, handleSize, ctx.lineWidth);
    ctx.fillRect(coords.left - 2, coords.bottom - handleSize + 2, ctx.lineWidth, handleSize);
    // Bottom-right
    ctx.fillRect(coords.right - handleSize + 2, coords.bottom - ctx.lineWidth + 2, handleSize, ctx.lineWidth);
    ctx.fillRect(coords.right - ctx.lineWidth + 2, coords.bottom - handleSize + 2, ctx.lineWidth, handleSize);

    return coords;
  }

  /**
   * Crops the image to the target ratio and returns a JPEG/PNG Blob
   */
  static async cropToBlob(imgSource, ratios, format = "image/jpeg", quality = 0.95) {
    const img = await this.loadImage(imgSource);
    const coords = this.calculateCoordinates(img.width, img.height, ratios);

    const canvas = document.createElement("canvas");
    canvas.width = coords.sWidth;
    canvas.height = coords.sHeight;

    const ctx = canvas.getContext("2d");
    // Draw only the sliced area
    ctx.drawImage(
      img,
      coords.sx,
      coords.sy,
      coords.sWidth,
      coords.sHeight,
      0,
      0,
      coords.sWidth,
      coords.sHeight
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({
              blob,
              width: coords.sWidth,
              height: coords.sHeight,
              coords,
            });
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        format,
        quality
      );
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CropperEngine;
}
