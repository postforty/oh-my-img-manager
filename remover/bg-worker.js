/**
 * Background AI Segmentation Worker using Transformers.js (ONNX Runtime Web)
 * Reference: addyosmani/bg-remove (https://github.com/addyosmani/bg-remove)
 */

import { AutoModel, AutoProcessor, env, RawImage } from "../lib/transformers/transformers.min.js";

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
 * Uses custom processor config matching RMBG-1.4's expected preprocessing:
 *   mean=[0.5, 0.5, 0.5], std=[1.0, 1.0, 1.0], size=1024x1024
 */
async function getModelAndProcessor(modelId = "briaai/RMBG-1.4", progressCallback) {
  if (modelInstance && processorInstance && currentModelId === modelId) {
    return { model: modelInstance, processor: processorInstance };
  }

  currentModelId = modelId;

  modelInstance = await AutoModel.from_pretrained(modelId, {
    config: { model_type: "custom" },
    progress_callback: progressCallback,
  });

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

      self.postMessage({ id, type: "INFERENCE_START" });

      // 3. Preprocess using AutoProcessor with custom RMBG config
      const rawImage = new RawImage(new Uint8ClampedArray(imageData), width, height, 4);
      const { pixel_values } = await processor(rawImage);

      // 4. Run AI inference
      const { output } = await model({ input: pixel_values });

      // 5. Postprocess: convert output tensor to uint8 alpha mask and resize to original dimensions
      // Reference: addyosmani/bg-remove - output[0].mul(255).to("uint8")
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
