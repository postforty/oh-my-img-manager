/**
 * Background AI Segmentation Worker using Transformers.js (ONNX Runtime Web)
 * Supports WebGPU Acceleration and Multiple Models (MODNet, RMBG-1.4)
 */

import { AutoModel, AutoProcessor, env, RawImage } from "../lib/transformers/transformers.min.js";

// Determine WebGPU capability
const hasWebGPU = typeof navigator !== "undefined" && navigator.gpu;
let currentBackend = hasWebGPU ? "webgpu" : "wasm";

// Configure local WASM binaries and browser cache
if (env) {
  env.allowLocalModels = false;
  env.useBrowserCache = true;

  // Set absolute WASM directory path to prevent double-resolving relative paths in Chrome Extensions
  const extensionBase = typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
    ? chrome.runtime.getURL("lib/transformers/")
    : (typeof self !== "undefined" && self.location && self.location.origin
        ? self.location.origin + "/lib/transformers/"
        : undefined);

  if (extensionBase && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = extensionBase;
    env.backends.onnx.wasm.numThreads = 1;
  }
}

let modelInstance = null;
let processorInstance = null;
let currentModelId = null;

/**
 * Initializes or retrieves the model and processor.
 */
async function getModelAndProcessor(modelId = "briaai/RMBG-1.4", progressCallback) {
  if (modelInstance && processorInstance && currentModelId === modelId) {
    return { model: modelInstance, processor: processorInstance };
  }

  currentModelId = modelId;

  // Try loading model with preferred backend
  try {
    if (currentBackend === "webgpu") {
      env.backends.onnx.wasm.proxy = false; // Disable proxy for direct WebGPU access
    }

    const modelOptions = {
      device: currentBackend,
      progress_callback: progressCallback,
    };
    
    // briaai/RMBG-1.4 requires custom model_type config
    if (modelId === "briaai/RMBG-1.4") {
      modelOptions.config = { model_type: "custom" };
    }

    modelInstance = await AutoModel.from_pretrained(modelId, modelOptions);
  } catch (err) {
    console.warn(`Failed to load model on ${currentBackend}, falling back to wasm`, err);
    if (currentBackend === "webgpu") {
      currentBackend = "wasm";
      const modelOptions = {
        device: "wasm",
        progress_callback: progressCallback,
      };
      if (modelId === "briaai/RMBG-1.4") {
        modelOptions.config = { model_type: "custom" };
      }
      modelInstance = await AutoModel.from_pretrained(modelId, modelOptions);
    } else {
      throw err;
    }
  }

  // Processor configuration
  if (modelId === "briaai/RMBG-1.4") {
    // Custom processor config following addyosmani/bg-remove reference implementation
    processorInstance = await AutoProcessor.from_pretrained(modelId, {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      },
      progress_callback: progressCallback,
    });
  } else {
    // Default processor for models like Xenova/modnet
    processorInstance = await AutoProcessor.from_pretrained(modelId, {
      progress_callback: progressCallback,
    });
  }

  return { model: modelInstance, processor: processorInstance };
}

/**
 * Message Handler
 */
self.onmessage = async (e) => {
  const { id, type, modelId, imageData, width, height } = e.data;

  if (type === "REMOVE_BG") {
    try {
      // 1. Progress notification helper
      const onProgress = (data) => {
        if (data.status === "progress") {
          self.postMessage({
            id,
            type: "PROGRESS",
            file: data.file,
            progress: Math.round(data.progress || 0),
          });
        } else if (data.status === "initiate") {
          self.postMessage({
            id,
            type: "INITIATE",
            file: data.file,
          });
        } else if (data.status === "done") {
          self.postMessage({
            id,
            type: "DONE_FILE",
            file: data.file,
          });
        }
      };

      // 2. Load Model & Processor
      const { model, processor } = await getModelAndProcessor(
        modelId || "briaai/RMBG-1.4",
        onProgress
      );

      // Report which backend is actually being used
      self.postMessage({ id, type: "BACKEND_INFO", backend: currentBackend });
      self.postMessage({ id, type: "INFERENCE_START" });

      // 3. Preprocess
      const rawImage = new RawImage(new Uint8ClampedArray(imageData), width, height, 4);
      const { pixel_values } = await processor(rawImage);

      // 4. Run AI inference
      const { output } = await model({ input: pixel_values });

      // 5. Postprocess: convert output tensor to uint8 alpha mask and resize to original dimensions
      const maskRaw = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(width, height);

      // Extract mask buffer (single channel grayscale: 255=foreground, 0=background)
      const maskBuffer = maskRaw.data.buffer.slice(
        maskRaw.data.byteOffset,
        maskRaw.data.byteOffset + maskRaw.data.byteLength
      );

      // Send result back to main thread using transferable buffer
      self.postMessage(
        {
          id,
          type: "SUCCESS",
          maskBuffer,
          width,
          height,
        },
        [maskBuffer]
      );
    } catch (err) {
      console.error("AI Segmentation Error in Worker:", err);
      self.postMessage({
        id,
        type: "ERROR",
        error: err.message || "Failed to process image with AI model",
      });
    }
  }
};
