/**
 * SimpleGifEncoder - Lightweight, Zero-dependency Client-side GIF89a Encoder
 * Supports adaptive 256-color palette (Median Cut), 1-bit transparency, and LZW compression.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SimpleGifEncoder = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  class SimpleGifEncoder {
    /**
     * Encodes RGBA pixel array into a GIF89a Uint8Array
     * @param {number} width - Image width
     * @param {number} height - Image height
     * @param {Uint8ClampedArray|Uint8Array} rgbaData - Raw RGBA pixel data
     * @param {Object} options - { transparent: boolean, transparentThreshold: number }
     * @returns {Uint8Array}
     */
    static encode(width, height, rgbaData, options = {}) {
      const hasTransparent = options.transparent !== false;
      const transparentThreshold = options.transparentThreshold || 128;
      const numPixels = width * height;

      // 1. Separate transparent and opaque pixels
      const opaquePixels = [];
      const pixelAlpha = new Uint8Array(numPixels);

      for (let i = 0; i < numPixels; i++) {
        const a = rgbaData[i * 4 + 3];
        if (hasTransparent && a < transparentThreshold) {
          pixelAlpha[i] = 1; // Transparent
        } else {
          pixelAlpha[i] = 0; // Opaque
          opaquePixels.push([
            rgbaData[i * 4],
            rgbaData[i * 4 + 1],
            rgbaData[i * 4 + 2]
          ]);
        }
      }

      // 2. Build Palette
      // Palette index 0 is reserved for transparent color
      const palette = [[0, 0, 0]];
      const maxPaletteColors = hasTransparent ? 255 : 256;

      if (opaquePixels.length > 0) {
        const quantized = this.quantizeMedianCut(opaquePixels, maxPaletteColors);
        for (let i = 0; i < quantized.length; i++) {
          palette.push(quantized[i]);
        }
      }

      // Pad remaining palette slots to 256 colors
      while (palette.length < 256) {
        palette.push([0, 0, 0]);
      }

      // 3. Fast Color Matching with 15-bit LUT (32KB)
      const lut = new Int16Array(32768);
      lut.fill(-1);

      const startIndex = hasTransparent ? 1 : 0;
      const getNearestColor = (r, g, b) => {
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
        if (lut[key] !== -1) return lut[key];

        let bestDist = Infinity;
        let bestIdx = startIndex;
        const palLen = Math.min(256, palette.length);
        for (let i = startIndex; i < palLen; i++) {
          const p = palette[i];
          const dr = r - p[0];
          const dg = g - p[1];
          const db = b - p[2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
            if (dist === 0) break;
          }
        }
        lut[key] = bestIdx;
        return bestIdx;
      };

      // 4. Map Pixels to Palette Indices
      const indexedPixels = new Uint8Array(numPixels);
      for (let i = 0; i < numPixels; i++) {
        if (hasTransparent && pixelAlpha[i] === 1) {
          indexedPixels[i] = 0; // Transparent index
        } else {
          const r = rgbaData[i * 4];
          const g = rgbaData[i * 4 + 1];
          const b = rgbaData[i * 4 + 2];
          indexedPixels[i] = getNearestColor(r, g, b);
        }
      }

      // 5. Assemble GIF Byte Stream
      const out = [];

      // Header: GIF89a
      out.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);

      // Logical Screen Descriptor
      out.push(width & 0xFF, (width >> 8) & 0xFF);
      out.push(height & 0xFF, (height >> 8) & 0xFF);
      out.push(0xF7); // GCT Flag (1), 8-bit color resolution, 256 colors (0xF7)
      out.push(0x00); // Background Color Index
      out.push(0x00); // Pixel Aspect Ratio

      // Global Color Table (256 * 3 = 768 bytes)
      for (let i = 0; i < 256; i++) {
        const col = palette[i] || [0, 0, 0];
        out.push(col[0], col[1], col[2]);
      }

      // Graphic Control Extension (Transparency & Disposal)
      if (hasTransparent) {
        out.push(0x21, 0xF9, 0x04);
        out.push(0x09); // Disposal = 2 (Restore to background), Transparent flag = 1
        out.push(0x00, 0x00); // Delay time (0)
        out.push(0x00); // Transparent color index = 0
        out.push(0x00); // Block terminator
      }

      // Image Descriptor
      out.push(0x2C);
      out.push(0x00, 0x00, 0x00, 0x00); // Left, Top (0, 0)
      out.push(width & 0xFF, (width >> 8) & 0xFF);
      out.push(height & 0xFF, (height >> 8) & 0xFF);
      out.push(0x00); // No local color table, non-interlaced

      // Image Data (LZW)
      const minCodeSize = 8;
      out.push(minCodeSize);

      this.lzwEncode(indexedPixels, minCodeSize, out);

      // Trailer
      out.push(0x3B);

      return new Uint8Array(out);
    }

    /**
     * Median Cut Color Quantization
     */
    static quantizeMedianCut(pixels, maxColors) {
      if (pixels.length <= maxColors) {
        return pixels;
      }

      // Sample pixels if too large to ensure fast execution (< 30,000 samples)
      let samples = pixels;
      if (pixels.length > 30000) {
        const step = Math.ceil(pixels.length / 30000);
        samples = [];
        for (let i = 0; i < pixels.length; i += step) {
          samples.push(pixels[i]);
        }
      }

      const boxes = [{ pixels: samples }];

      while (boxes.length < maxColors) {
        let bestBoxIdx = -1;
        let maxRange = -1;
        let splitChannel = 0;

        for (let b = 0; b < boxes.length; b++) {
          const box = boxes[b];
          if (box.pixels.length <= 1) continue;

          let minR = 255, maxR = 0, minG = 255, maxG = 0, minB = 255, maxB = 0;
          for (let p = 0; p < box.pixels.length; p++) {
            const px = box.pixels[p];
            if (px[0] < minR) minR = px[0]; if (px[0] > maxR) maxR = px[0];
            if (px[1] < minG) minG = px[1]; if (px[1] > maxG) maxG = px[1];
            if (px[2] < minB) minB = px[2]; if (px[2] > maxB) maxB = px[2];
          }

          const rangeR = maxR - minR;
          const rangeG = maxG - minG;
          const rangeB = maxB - minB;
          const currentMax = Math.max(rangeR, rangeG, rangeB);

          if (currentMax > maxRange) {
            maxRange = currentMax;
            bestBoxIdx = b;
            if (currentMax === rangeR) splitChannel = 0;
            else if (currentMax === rangeG) splitChannel = 1;
            else splitChannel = 2;
          }
        }

        if (bestBoxIdx === -1 || maxRange === 0) break;

        const boxToSplit = boxes.splice(bestBoxIdx, 1)[0];
        boxToSplit.pixels.sort((p1, p2) => p1[splitChannel] - p2[splitChannel]);

        const mid = Math.floor(boxToSplit.pixels.length / 2);
        boxes.push({ pixels: boxToSplit.pixels.slice(0, mid) });
        boxes.push({ pixels: boxToSplit.pixels.slice(mid) });
      }

      return boxes.map((box) => {
        let sumR = 0, sumG = 0, sumB = 0;
        for (let p = 0; p < box.pixels.length; p++) {
          sumR += box.pixels[p][0];
          sumG += box.pixels[p][1];
          sumB += box.pixels[p][2];
        }
        const len = box.pixels.length || 1;
        return [
          Math.round(sumR / len),
          Math.round(sumG / len),
          Math.round(sumB / len),
        ];
      });
    }

    /**
     * Standard GIF LZW Encoder
     */
    static lzwEncode(pixels, minCodeSize, out) {
      const clearCode = 1 << minCodeSize; // 256
      const eoiCode = clearCode + 1; // 257
      let codeSize = minCodeSize + 1; // 9
      let nextCode = clearCode + 2; // 258

      const HASH_SIZE = 5003;
      const hashKeys = new Int32Array(HASH_SIZE);
      const hashValues = new Int32Array(HASH_SIZE);

      const clearTable = () => {
        hashKeys.fill(-1);
        hashValues.fill(-1);
        codeSize = minCodeSize + 1;
        nextCode = clearCode + 2;
      };

      clearTable();

      let curAccum = 0;
      let curBits = 0;
      const packet = [];

      const flushPacket = () => {
        if (packet.length > 0) {
          out.push(packet.length);
          for (let i = 0; i < packet.length; i++) {
            out.push(packet[i]);
          }
          packet.length = 0;
        }
      };

      const emitBits = (code, bits) => {
        curAccum |= (code << curBits);
        curBits += bits;
        while (curBits >= 8) {
          packet.push(curAccum & 0xFF);
          if (packet.length === 255) {
            flushPacket();
          }
          curAccum >>= 8;
          curBits -= 8;
        }
      };

      // 1. Emit Initial Clear Code
      emitBits(clearCode, codeSize);

      if (pixels.length > 0) {
        let prefix = pixels[0];

        for (let i = 1; i < pixels.length; i++) {
          const k = pixels[i];
          const hashKey = (prefix << 8) | k;
          let hashIdx = ((hashKey % HASH_SIZE) + HASH_SIZE) % HASH_SIZE;
          let found = false;

          while (hashKeys[hashIdx] !== -1) {
            if (hashKeys[hashIdx] === hashKey) {
              prefix = hashValues[hashIdx];
              found = true;
              break;
            }
            hashIdx = (hashIdx + 1) % HASH_SIZE;
          }

          if (!found) {
            emitBits(prefix, codeSize);

            if (nextCode < 4096) {
              hashKeys[hashIdx] = hashKey;
              hashValues[hashIdx] = nextCode++;
              if (nextCode > (1 << codeSize) && codeSize < 12) {
                codeSize++;
              }
            } else {
              emitBits(clearCode, codeSize);
              clearTable();
            }

            prefix = k;
          }
        }

        emitBits(prefix, codeSize);
      }

      // Emit EOI Code
      emitBits(eoiCode, codeSize);

      // Flush remaining bits
      if (curBits > 0) {
        packet.push(curAccum & 0xFF);
      }
      flushPacket();

      // Block terminator
      out.push(0x00);
    }
  }

  return SimpleGifEncoder;
});
