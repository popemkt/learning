// ============================================================================
// FORMAT REGISTRY: COMPREHENSIVE TAXONOMY OF AI MODEL FORMATS
// ============================================================================

import {
  FormatCategory,
  SecurityRisk,
  type ModelFormatProfile,
} from "../types.js";

// ✅ ATTENTION: Master registry detailing architecture, security, and runtime traits of every major format
export const MODEL_FORMAT_PROFILES: Record<string, ModelFormatProfile> = {
  GGUF: {
    id: "gguf",
    displayName: "GGUF (GPT-Generated Unified Format)",
    fileExtensions: [".gguf"],
    category: FormatCategory.UNIFIED_EDGE_QUANT,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: true,
    containsTokenizer: true,
    containsArchitectureHyperparams: true,
    primaryEcosystem: "llama.cpp / Ollama / LM Studio / LocalAI / Jan / Apple Metal",
    bestFor:
      "Local execution on consumer hardware, Apple Silicon unified memory, CPU+GPU offloading, single-file distribution.",
    worstFor:
      "Multi-node distributed training, high-throughput server batching (use vLLM with SafeTensors/AWQ instead).",
    typicalDTypes: ["Q4_K_M", "Q5_K_M", "Q8_0", "IQ3_M", "BF16", "F16"],
  },

  SAFETENSORS: {
    id: "safetensors",
    displayName: "SafeTensors (Hugging Face Zero-Copy Standard)",
    fileExtensions: [".safetensors"],
    category: FormatCategory.WEIGHT_CONTAINER,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: false, // Requires external config.json + tokenizer.json
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "Hugging Face / vLLM / SGLang / TGI / PyTorch / Diffusers",
    bestFor:
      "High-throughput server GPU inference (vLLM), model fine-tuning, training checkpoints, standard web hub sharing.",
    worstFor:
      "Consumer CPU-only execution without Python runtime (GGUF is far superior for CPU/Metal).",
    typicalDTypes: ["BF16", "FP16", "FP8", "FP32", "INT4 (Packed)"],
  },
  MLX: {
    id: "mlx",
    displayName: "Apple MLX SafeTensors (Metal Unified Memory Native)",
    fileExtensions: [".safetensors"],
    category: FormatCategory.MLX_UNIFIED_CONTAINER,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: false, // Bundle with config.json + tokenizer.json
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "Apple MLX / mlx-lm / mlx-community (Hugging Face) / Metal",
    bestFor:
      "Native training, LoRA fine-tuning, and high-speed generation exclusively on Apple Silicon (M1/M2/M3/M4) unified memory.",
    worstFor:
      "Non-Apple hardware (NVIDIA CUDA or x86 Linux servers).",
    typicalDTypes: ["4-bit (affine)", "8-bit", "BF16", "FP16"],
  },

  FP8_NATIVE: {
    id: "fp8_native",
    displayName: "Native FP8 SafeTensors (OCP E4M3 / E5M2 Standard)",
    fileExtensions: [".safetensors"],
    category: FormatCategory.NATIVE_FP8_CONTAINER,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: false,
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "vLLM / DeepSeek-V3 / DeepSeek-R1 / NVIDIA Hopper & Ada / SGLang",
    bestFor:
      "Native 8-bit floating-point execution on modern GPUs (H100/H200/RTX 4090/B200) without runtime integer dequantization overhead.",
    worstFor:
      "Older legacy GPUs (Pascal/Turing/Volta) without hardware FP8 Tensor Cores.",
    typicalDTypes: ["F8_E4M3", "F8_E5M2"],
  },

  BITNET: {
    id: "bitnet",
    displayName: "BitNet b1.58 (1.58-bit Ternary {-1, 0, +1})",
    fileExtensions: [".safetensors", ".gguf", ".bin"],
    category: FormatCategory.TERNARY_BITNET,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: true,
    containsTokenizer: true,
    containsArchitectureHyperparams: true,
    primaryEcosystem: "Microsoft BitNet / bitnet.cpp / Specialized 1-bit LLM kernels",
    bestFor:
      "Extreme low-power edge inference where matrix multiplications are replaced entirely with integer additions.",
    worstFor:
      "Standard LLMs not trained natively with ternary quantization (cannot convert existing FP16 LLMs post-hoc without retrain).",
    typicalDTypes: ["1.58-bit Ternary {-1, 0, +1}"],
  },
  PYTORCH_PICKLE: {
    id: "pytorch_pickle",
    displayName: "PyTorch Checkpoint (.pt / .bin / .pth)",
    fileExtensions: [".pt", ".bin", ".pth"],
    category: FormatCategory.TRAINING_CHECKPOINT,
    securityRisk: SecurityRisk.ARBITRARY_CODE_EXECUTION, // ⚠️ CRITICAL security flaw
    supportsMmap: false,
    isSingleFileSelfContained: false,
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "Legacy PyTorch / DeepSpeed / Megatron-LM training codebases",
    bestFor:
      "Internal training resumption where arbitrary Python state (optimizer, RNG, lr_scheduler) must be serialized.",
    worstFor:
      "Public untrusted model distribution (HIGH RCE EXPLOIT RISK), fast production inference.",
    typicalDTypes: ["FP32", "FP16", "BF16"],
  },

  AWQ: {
    id: "awq",
    displayName: "AWQ (Activation-aware Weight Quantization in SafeTensors)",
    fileExtensions: [".safetensors"],
    category: FormatCategory.GPU_PACKED_QUANT,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: false,
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "vLLM / TGI / AutoAWQ / Hugging Face",
    bestFor:
      "High-throughput batched server inference on NVIDIA Tensor Cores (protects 1% salient weights).",
    worstFor:
      "CPU inference or Apple Silicon Metal (where GGUF k-quants are far more optimized).",
    typicalDTypes: ["INT4 (Packed with FP16 scales/zeros)"],
  },

  GPTQ: {
    id: "gptq",
    displayName: "GPTQ (Generalized Post-Training Quantization in SafeTensors)",
    fileExtensions: [".safetensors"],
    category: FormatCategory.GPU_PACKED_QUANT,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: false,
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "AutoGPTQ / ExLlamaV2 / vLLM / Hugging Face",
    bestFor:
      "Single-GPU or multi-GPU NVIDIA inference with second-order Hessian error compensation.",
    worstFor:
      "Frequent model fine-tuning or CPU execution.",
    typicalDTypes: ["INT4", "INT8 (Packed)"],
  },

  EXL2: {
    id: "exl2",
    displayName: "EXL2 (ExLlamaV2 Sub-Byte Mixed Precision)",
    fileExtensions: [".safetensors"],
    category: FormatCategory.GPU_PACKED_QUANT,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: false,
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "ExLlamaV2 / TabbyAPI",
    bestFor:
      "Extreme single-stream token generation speed on NVIDIA consumer GPUs (RTX 3090/4090).",
    worstFor:
      "Non-NVIDIA hardware (AMD/Apple/CPU) or standard vLLM serving.",
    typicalDTypes: ["2.2 to 8.0 bpw (sub-byte packed)"],
  },

  GGML_LEGACY: {
    id: "ggml_legacy",
    displayName: "GGML / GGJT (Legacy Georgi Gerganov Format)",
    fileExtensions: [".bin", ".ggml", ".ggjt"],
    category: FormatCategory.LEGACY_QUANT,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: false,
    isSingleFileSelfContained: true,
    containsTokenizer: false,
    containsArchitectureHyperparams: false,
    primaryEcosystem: "Deprecated (Replaced entirely by GGUF in August 2023)",
    bestFor:
      "Historical curiosity and understanding the evolution toward GGUF.",
    worstFor:
      "Modern LLM inference (brittle architecture mapping, broken multi-architecture support).",
    typicalDTypes: ["Q4_0", "Q4_1", "Q5_0", "Q8_0"],
  },

  ONNX: {
    id: "onnx",
    displayName: "ONNX (Open Neural Network Exchange)",
    fileExtensions: [".onnx"],
    category: FormatCategory.COMPILED_ENGINE,
    securityRisk: SecurityRisk.SAFE,
    supportsMmap: true,
    isSingleFileSelfContained: true,
    containsTokenizer: false,
    containsArchitectureHyperparams: true,
    primaryEcosystem: "ONNX Runtime / DirectML / WebGPU (Transformers.js) / Edge Mobile",
    bestFor:
      "Cross-platform execution on Windows (DirectML), in-browser WebGPU inference, embedded devices.",
    worstFor:
      "70B+ parameter generative LLMs requiring rapid multi-GPU scaling.",
    typicalDTypes: ["FP32", "FP16", "INT8 (Dynamic/Static)"],
  },

  TENSORRT_ENGINE: {
    id: "tensorrt_engine",
    displayName: "TensorRT / TensorRT-LLM Engine",
    fileExtensions: [".engine", ".plan"],
    category: FormatCategory.COMPILED_ENGINE,
    securityRisk: SecurityRisk.COMPILED_EXECUTABLE_BLOB,
    supportsMmap: true,
    isSingleFileSelfContained: true,
    containsTokenizer: false,
    containsArchitectureHyperparams: true,
    primaryEcosystem: "NVIDIA TensorRT-LLM / Triton Inference Server",
    bestFor:
      "Absolute maximum hardware-fused matrix multiplication and latency in enterprise NVIDIA GPU clusters.",
    worstFor:
      "Portability (a .engine compiled for RTX 4090 WILL CRASH on A100 or H100; strictly hardware & driver locked).",
    typicalDTypes: ["FP8", "FP16", "INT4 (Kernel-fused)"],
  },
};

// Helper: Query formats by category or capability
export function getFormatsByCategory(category: FormatCategory): ModelFormatProfile[] {
  return Object.values(MODEL_FORMAT_PROFILES).filter((p) => p.category === category);
}

export function getSafeFormats(): ModelFormatProfile[] {
  return Object.values(MODEL_FORMAT_PROFILES).filter(
    (p) => p.securityRisk === SecurityRisk.SAFE
  );
}
