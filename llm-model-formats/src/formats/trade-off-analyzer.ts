// ============================================================================
// TRADE-OFF ANALYZER: VRAM, KV CACHE, MEMORY BANDWIDTH & OFFLOADING
// ============================================================================

import { QUANTIZATION_SCHEMES } from "./quantization-engine.js";
import { type ModelSpec, type VRAMCalculationResult } from "../types.js";

// Standard canonical model specs
export const CANONICAL_MODELS: Record<string, ModelSpec> = {
  "Llama-3-8B": {
    parameterCountBillions: 8.03,
    contextWindowTokens: 8192,
    vocabSize: 128256,
    hiddenDim: 4096,
    numLayers: 32,
    numAttentionHeads: 32,
    numKeyValueHeads: 8, // Grouped-Query Attention (GQA) 4:1
  },
  "Mistral-7B-v0.3": {
    parameterCountBillions: 7.24,
    contextWindowTokens: 32768,
    vocabSize: 32768,
    hiddenDim: 4096,
    numLayers: 32,
    numAttentionHeads: 32,
    numKeyValueHeads: 8,
  },
  "Llama-3-70B": {
    parameterCountBillions: 70.6,
    contextWindowTokens: 8192,
    vocabSize: 128256,
    hiddenDim: 8192,
    numLayers: 80,
    numAttentionHeads: 64,
    numKeyValueHeads: 8, // GQA 8:1
  },
  "DeepSeek-R1-Distill-Qwen-14B": {
    parameterCountBillions: 14.7,
    contextWindowTokens: 65536,
    vocabSize: 152064,
    hiddenDim: 5120,
    numLayers: 48,
    numAttentionHeads: 40,
    numKeyValueHeads: 8,
  },
};

// Hardware bandwidth & VRAM profiles
export interface HardwareProfile {
  name: string;
  vramGB: number;
  memoryBandwidthGBs: number;
  architecture: "Apple Silicon" | "NVIDIA GPU" | "x86 CPU" | "AMD GPU";
}

export const CANONICAL_HARDWARE: Record<string, HardwareProfile> = {
  "Apple M4 (Unified Memory)": {
    name: "Apple M4",
    vramGB: 24, // 24GB Unified
    memoryBandwidthGBs: 120,
    architecture: "Apple Silicon",
  },
  "Apple M4 Pro (Unified Memory)": {
    name: "Apple M4 Pro",
    vramGB: 48,
    memoryBandwidthGBs: 273,
    architecture: "Apple Silicon",
  },
  "Apple M4 Max (Unified Memory)": {
    name: "Apple M4 Max",
    vramGB: 128,
    memoryBandwidthGBs: 546,
    architecture: "Apple Silicon",
  },
  "NVIDIA RTX 4070 (12GB)": {
    name: "NVIDIA RTX 4070",
    vramGB: 12,
    memoryBandwidthGBs: 504,
    architecture: "NVIDIA GPU",
  },
  "NVIDIA RTX 4090 (24GB)": {
    name: "NVIDIA RTX 4090",
    vramGB: 24,
    memoryBandwidthGBs: 1008,
    architecture: "NVIDIA GPU",
  },
  "NVIDIA H100 SXM5 (80GB)": {
    name: "NVIDIA H100 SXM5",
    vramGB: 80,
    memoryBandwidthGBs: 3350,
    architecture: "NVIDIA GPU",
  },
  "Standard x86 DDR5 Dual-Channel CPU": {
    name: "Intel/AMD DDR5-5600 Dual Channel",
    vramGB: 64, // System RAM
    memoryBandwidthGBs: 89.6,
    architecture: "x86 CPU",
  },
};

// ✅ ATTENTION: Calculates exact VRAM requirements for model weights, KV cache, and activation buffers
export function calculateVRAMBudget(params: {
  model: ModelSpec;
  quantizationScheme: string; // e.g. "Q4_K_M", "F16", "Q8_0", "AWQ_INT4"
  contextTokens: number;
  kvCacheDType?: "FP16" | "Q8_0" | "Q4_0";
  availableVRAMGB?: number;
}): VRAMCalculationResult {
  const quantInfo = QUANTIZATION_SCHEMES[params.quantizationScheme] ?? QUANTIZATION_SCHEMES.Q4_K_M;
  const kvCacheDType = params.kvCacheDType ?? "FP16";

  // 1. Model Weights Memory
  // Bytes = (Parameters in Billions * 1e9) * (BitsPerWeight / 8)
  const weightsMemoryBytes =
    params.model.parameterCountBillions * 1e9 * (quantInfo.bitsPerWeight / 8.0);
  const weightsMemoryGB = weightsMemoryBytes / (1024 * 1024 * 1024);

  // 2. KV Cache Memory (Grouped-Query Attention Aware)
  // Per token bytes = 2 (Key + Value) * numLayers * numKeyValueHeads * headDim * bytesPerDtype
  const headDim = params.model.hiddenDim / params.model.numAttentionHeads;
  const kvBytesPerElement = kvCacheDType === "FP16" ? 2 : kvCacheDType === "Q8_0" ? 1 : 0.5625;

  const kvCacheMemoryPerTokenBytes =
    2 * params.model.numLayers * params.model.numKeyValueHeads * headDim * kvBytesPerElement;
  const kvCacheTotalBytes = kvCacheMemoryPerTokenBytes * params.contextTokens;
  const kvCacheTotalGB = kvCacheTotalBytes / (1024 * 1024 * 1024);

  // 3. Activation & Runtime Context Overhead
  // Activation buffer scales with hidden dim & context
  const activationOverheadGB =
    (params.model.hiddenDim * params.contextTokens * 4) / (1024 * 1024 * 1024 * 16) + 0.35;
  const cudaContextOverheadGB = 0.55; // CUDA driver runtime & context buffers

  const totalVRAMRequiredGB =
    weightsMemoryGB + kvCacheTotalGB + activationOverheadGB + cudaContextOverheadGB;

  const availableVRAM = params.availableVRAMGB ?? 24;
  const canFitInVRAM = totalVRAMRequiredGB <= availableVRAM;

  // 4. Layer Offload Recommendation if VRAM is constrained (llama.cpp CPU+GPU split)
  let offloadLayersRecommended: number | undefined = undefined;
  if (!canFitInVRAM) {
    const memoryPerLayerGB = weightsMemoryGB / params.model.numLayers;
    const availableForWeights = Math.max(
      0,
      availableVRAM - (kvCacheTotalGB + activationOverheadGB + cudaContextOverheadGB)
    );
    offloadLayersRecommended = Math.min(
      params.model.numLayers,
      Math.max(0, Math.floor(availableForWeights / memoryPerLayerGB))
    );
  } else {
    offloadLayersRecommended = params.model.numLayers; // Full GPU offload (e.g. -ngl 33)
  }

  return {
    weightsMemoryBytes,
    weightsMemoryGB: Number(weightsMemoryGB.toFixed(2)),
    kvCacheMemoryPerTokenBytes: Number(kvCacheMemoryPerTokenBytes.toFixed(2)),
    kvCacheTotalGB: Number(kvCacheTotalGB.toFixed(2)),
    activationOverheadGB: Number(activationOverheadGB.toFixed(2)),
    cudaContextOverheadGB: Number(cudaContextOverheadGB.toFixed(2)),
    totalVRAMRequiredGB: Number(totalVRAMRequiredGB.toFixed(2)),
    canFitInVRAM,
    offloadLayersRecommended,
  };
}

// ✅ ATTENTION: Calculates theoretical generation throughput (tokens/sec) based on memory bandwidth
export function estimateInferenceThroughput(params: {
  model: ModelSpec;
  quantizationScheme: string;
  hardware: HardwareProfile;
  batchSize?: number;
}): {
  theoreticalTokensPerSecond: number;
  bandwidthUtilizationGBs: number;
  limitingFactor: "MEMORY_BANDWIDTH" | "COMPUTE_TFLOPS";
} {
  const quantInfo = QUANTIZATION_SCHEMES[params.quantizationScheme] ?? QUANTIZATION_SCHEMES.Q4_K_M;
  const batchSize = params.batchSize ?? 1;

  // For batch size = 1 (autoregressive decoding), LLMs are 100% memory bandwidth bound
  const modelSizeBytes =
    params.model.parameterCountBillions * 1e9 * (quantInfo.bitsPerWeight / 8.0);
  const modelSizeGB = modelSizeBytes / (1024 * 1024 * 1024);

  // Theoretical max tokens/sec = Bandwidth (GB/s) / Model Size (GB) * efficiency factor (~0.85)
  const theoreticalTokensPerSecond = (params.hardware.memoryBandwidthGBs / modelSizeGB) * 0.85;

  return {
    theoreticalTokensPerSecond: Number(theoreticalTokensPerSecond.toFixed(1)),
    bandwidthUtilizationGBs: params.hardware.memoryBandwidthGBs,
    limitingFactor: batchSize <= 4 ? "MEMORY_BANDWIDTH" : "COMPUTE_TFLOPS",
  };
}
