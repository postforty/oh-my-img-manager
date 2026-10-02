/**
 * ObjectEngine - Lightweight Zero-Dependency HTML5 Canvas Vector Object Engine
 * Supports Rectangles, Circles, Lines, Arrows, Text, and Stickers.
 */
class ObjectEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext("2d") : null;
    /** @type {Array<Object>} */
    this.items = [];
    this.selectedId = null;

    this.defaultStyle = {
      strokeColor: "#38bdf8",
      strokeWidth: 4,
      fillColor: "#ffffff",
      isFilled: false,
      opacity: 1.0,
      borderRadius: 8,
      fontSize: 28,
      fontFamily: "Inter, system-ui, sans-serif",
      isBold: true,
      textAlign: "center",
      hasTextShadow: true,
    };
  }

  /**
   * Resizes object canvas matching main canvas resolution
   */
  resize(width, height) {
    if (!this.canvas) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderAll();
  }

  /**
   * Generates a unique ID
   */
  static generateId() {
    return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Checks if engine has any objects
   */
  hasItems() {
    return this.items.length > 0;
  }

  /**
   * Returns copy of items
   */
  getItems() {
    return [...this.items];
  }

  /**
   * Finds item by ID
   */
  getItemById(id) {
    return this.items.find((it) => it.id === id) || null;
  }

  /**
   * Returns currently selected item
   */
  getSelectedItem() {
    return this.selectedId ? this.getItemById(this.selectedId) : null;
  }

  /**
   * Sets active selected item ID
   */
  selectItem(id) {
    this.selectedId = id;
  }

  /**
   * Clears selection
   */
  clearSelection() {
    this.selectedId = null;
  }

  /**
   * Adds an item to the canvas
   */
  addItem(item) {
    if (!item.id) item.id = ObjectEngine.generateId();
    if (typeof item.opacity !== "number") item.opacity = this.defaultStyle.opacity;
    if (typeof item.rotation !== "number") item.rotation = 0;
    this.items.push(item);
    this.selectedId = item.id;
    this.renderAll();
    return item;
  }

  /**
   * Updates properties of an existing item
   */
  updateItem(id, props) {
    const item = this.getItemById(id);
    if (!item) return null;
    Object.assign(item, props);
    this.renderAll();
    return item;
  }

  /**
   * Removes an item by ID
   */
  removeItem(id) {
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      if (this.selectedId === id) {
        this.selectedId = null;
      }
      this.renderAll();
      return true;
    }
    return false;
  }

  /**
   * Duplicates an item by ID
   */
  duplicateItem(id) {
    const orig = this.getItemById(id);
    if (!orig) return null;

    const cloned = JSON.parse(JSON.stringify(orig));
    cloned.id = ObjectEngine.generateId();
    const offset = 20;
    cloned.x += offset;
    cloned.y += offset;
    if (typeof cloned.startX === "number") cloned.startX += offset;
    if (typeof cloned.startY === "number") cloned.startY += offset;
    if (typeof cloned.endX === "number") cloned.endX += offset;
    if (typeof cloned.endY === "number") cloned.endY += offset;

    this.items.push(cloned);
    this.selectedId = cloned.id;
    this.renderAll();
    return cloned;
  }

  /**
   * Moves item forward in z-order
   */
  bringForward(id) {
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx < this.items.length - 1 && idx !== -1) {
      const item = this.items.splice(idx, 1)[0];
      this.items.splice(idx + 1, 0, item);
      this.renderAll();
    }
  }

  /**
   * Moves item backward in z-order
   */
  sendBackward(id) {
    const idx = this.items.findIndex((it) => it.id === id);
    if (idx > 0) {
      const item = this.items.splice(idx, 1)[0];
      this.items.splice(idx - 1, 0, item);
      this.renderAll();
    }
  }

  /**
   * Clears all items and resets canvas
   */
  clearAll() {
    this.items = [];
    this.selectedId = null;
    this.renderAll();
  }

  /**
   * Redraws all objects on the canvas
   */
  renderAll() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const item of this.items) {
      ctx.save();
      ctx.globalAlpha = typeof item.opacity === "number" ? item.opacity : 1.0;

      switch (item.type) {
        case "rect":
          this._renderRect(ctx, item);
          break;
        case "circle":
          this._renderCircle(ctx, item);
          break;
        case "line":
          this._renderLine(ctx, item);
          break;
        case "arrow":
          this._renderArrow(ctx, item);
          break;
        case "text":
          this._renderText(ctx, item);
          break;
        default:
          break;
      }
      ctx.restore();
    }
  }

  /**
   * 1. Rectangle Renderer
   */
  _renderRect(ctx, item) {
    const { x, y, width, height, strokeColor, strokeWidth, fillColor, isFilled, borderRadius = 0 } = item;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;

    ctx.beginPath();
    if (typeof ctx.roundRect === "function" && borderRadius > 0) {
      const r = Math.min(borderRadius, Math.min(Math.abs(width), Math.abs(height)) / 2);
      ctx.roundRect(x, y, width, height, r);
    } else {
      ctx.rect(x, y, width, height);
    }

    if (isFilled) ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  }

  /**
   * 2. Circle / Ellipse Renderer
   */
  _renderCircle(ctx, item) {
    const { x, y, width, height, strokeColor, strokeWidth, fillColor, isFilled } = item;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;

    const rx = Math.abs(width) / 2;
    const ry = Math.abs(height) / 2;
    const cx = x + width / 2;
    const cy = y + height / 2;

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);

    if (isFilled) ctx.fill();
    if (strokeWidth > 0) ctx.stroke();
  }

  /**
   * 3. Straight Line Renderer
   */
  _renderLine(ctx, item) {
    const { startX, startY, endX, endY, strokeColor, strokeWidth } = item;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  /**
   * 4. Arrow Renderer (High Precision Triangular Head)
   */
  _renderArrow(ctx, item) {
    const { startX, startY, endX, endY, strokeColor, strokeWidth } = item;
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx * dx + dy * dy);

    // Arrowhead size dynamically scaled with stroke width
    const headLength = Math.max(12, strokeWidth * 3.5);
    const headAngle = Math.PI / 6; // 30 degrees

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    if (length > 5) {
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle - headAngle),
        endY - headLength * Math.sin(angle - headAngle)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(angle + headAngle),
        endY - headLength * Math.sin(angle + headAngle)
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * 5. Text Renderer with High Contrast Shadow/Border
   */
  _renderText(ctx, item) {
    const {
      x,
      y,
      width,
      height,
      text = "",
      fontSize = 28,
      fontFamily = "Inter, system-ui, sans-serif",
      isBold = true,
      fillColor = "#ffffff",
      strokeColor = "#000000",
      hasTextShadow = true,
      textAlign = "center",
    } = item;

    if (!text) return;

    const fontStyle = isBold ? "bold " : "normal ";
    ctx.font = `${fontStyle}${fontSize}px ${fontFamily}`;
    ctx.textAlign = textAlign;
    ctx.textBaseline = "middle";

    const lines = text.split("\n");
    const lineHeight = fontSize * 1.25;
    const totalTextHeight = lines.length * lineHeight;

    let targetX = x + width / 2;
    if (textAlign === "left") targetX = x;
    else if (textAlign === "right") targetX = x + width;

    let startY = y + height / 2 - totalTextHeight / 2 + lineHeight / 2;

    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;

      // Soft drop shadow / contrast stroke for readability
      if (hasTextShadow) {
        ctx.save();
        ctx.strokeStyle = strokeColor || "rgba(0, 0, 0, 0.75)";
        ctx.lineWidth = Math.max(2, Math.round(fontSize / 8));
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeText(lines[i], targetX, lineY);
        ctx.restore();
      }

      ctx.fillStyle = fillColor;
      ctx.fillText(lines[i], targetX, lineY);
    }
  }

  /**
   * Measures text bounding box
   */
  measureText(text, fontSize, isBold, fontFamily) {
    if (!this.ctx) return { width: 100, height: 40 };
    const fontStyle = isBold ? "bold " : "normal ";
    this.ctx.font = `${fontStyle}${fontSize}px ${fontFamily || "Inter, system-ui, sans-serif"}`;
    const lines = (text || "텍스트").split("\n");
    let maxW = 0;
    for (const line of lines) {
      const m = this.ctx.measureText(line);
      if (m.width > maxW) maxW = m.width;
    }
    const lineHeight = fontSize * 1.25;
    return {
      width: Math.max(20, Math.round(maxW + 20)),
      height: Math.max(lineHeight, Math.round(lines.length * lineHeight + 10)),
    };
  }

  /**
   * Hit test to find object at (x, y) coordinates
   * Iterates from top to bottom (last to first)
   */
  hitTest(x, y) {
    const pad = 8;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.type === "line" || item.type === "arrow") {
        if (this._hitTestLine(x, y, item.startX, item.startY, item.endX, item.endY, Math.max(pad, item.strokeWidth))) {
          return item;
        }
      } else {
        const left = Math.min(item.x, item.x + item.width) - pad;
        const right = Math.max(item.x, item.x + item.width) + pad;
        const top = Math.min(item.y, item.y + item.height) - pad;
        const bottom = Math.max(item.y, item.y + item.height) + pad;

        if (x >= left && x <= right && y >= top && y <= bottom) {
          return item;
        }
      }
    }
    return null;
  }

  /**
   * Distance from point to line segment
   */
  _hitTestLine(px, py, x1, y1, x2, y2, tolerance) {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1) <= tolerance;
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Math.hypot(px - projX, py - projY) <= tolerance;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ObjectEngine };
}
