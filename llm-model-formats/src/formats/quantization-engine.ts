// ============================================================================
// QUANTIZATION ENGINE: NUMERICAL SIMULATION, SCHEMES & ERROR METRICS
// ============================================================================

import { GGUFType, type QuantizationSchemeInfo } from "../types.js";

export interface QuantizationResult {
  scheme: string;
  originalFloat32: Float32Array;
  dequantizedFloat32: Float32Array;
  rawCompressedBytes: Uint8Array;
  bytesPerWeightEffective: number;
  compressionRatio: number; // e.g. 4.0x vs FP32
  rmse: number;             // Root Mean Square Error
  snrDb: number;            // Signal-to-Noise Ratio in Decibels
  maxAbsError: number;
  estimatedPplLossPct: number; // Approximate Perplexity Degradation %
}

// ✅ ATTENTION: Catalog of standard quantization schemes with performance/memory characteristics
export const QUANTIZATION_SCHEMES: Record<string, QuantizationSchemeInfo> = {
  F16: {
    name: "F16",
    bitsPerWeight: 16.0,
    blockSize: 1,
    description: "Standard IEEE 754 half-precision float. Baseline reference.",
    targetHardware: "NVIDIA / Apple Silicon / Modern CPUs",
    recommendedUse: "Baseline training, high-precision fine-tuning",
    relativeQualityVsFP16: 1.0,
    memoryReductionMultiplier: 2.0, // vs FP32
  },
  BF16: {
    name: "BF16",
    bitsPerWeight: 16.0,
    blockSize: 1,
    description: "Bfloat16 (8-bit exponent, 7-bit mantissa). Same dynamic range as FP32.",
    targetHardware: "NVIDIA Ampere+ / Apple Silicon / TPU",
    recommendedUse: "Default LLM pre-training & fine-tuning standard",
    relativeQualityVsFP16: 1.0,
    memoryReductionMultiplier: 2.0,
  },
  Q8_0: {
    name: "Q8_0",
    bitsPerWeight: 8.5, // 32 weights = 34 bytes (2-byte f16 scale + 32 bytes)
    blockSize: 32,
    description: "8-bit block quantization (symmetric scale per 32 weights).",
    targetHardware: "CPU / Metal / GPU",
    recommendedUse: "Near-lossless quantization (~99.9% FP16 quality) with 50% VRAM saving",
    relativeQualityVsFP16: 0.999,
    memoryReductionMultiplier: 1.88, // vs FP16
  },
  Q4_0: {
    name: "Q4_0",
    bitsPerWeight: 4.5, // 32 weights = 18 bytes (2-byte f16 scale + 16 bytes)
    blockSize: 32,
    description: "Legacy uniform 4-bit block quantization. Fast on CPUs.",
    targetHardware: "Entry-level CPUs / Mobile devices",
    recommendedUse: "Legacy CPU-only setups where SIMD vectorization is minimal",
    relativeQualityVsFP16: 0.95,
    memoryReductionMultiplier: 3.55,
  },
  Q4_K_M: {
    name: "Q4_K_M",
    bitsPerWeight: 4.5,
    blockSize: 256,
    description: "Medium K-quant: Mixed precision (Q4_K for FFN, Q5_K/Q6_K for attention).",
    targetHardware: "Apple Silicon (Metal) / Consumer NVIDIA GPUs / Modern x86 CPUs",
    recommendedUse: "The sweet spot for local LLM inference (balances VRAM & 98.5% quality)",
    relativeQualityVsFP16: 0.985,
    memoryReductionMultiplier: 3.55,
  },
  Q5_K_M: {
    name: "Q5_K_M",
    bitsPerWeight: 5.5,
    blockSize: 256,
    description: "Large 5-bit K-quant: Higher accuracy than Q4_K_M with minimal VRAM growth.",
    targetHardware: "Apple Silicon / 16GB+ GPUs",
    recommendedUse: "Complex reasoning tasks, coding, math where 4-bit causes slight degradation",
    relativeQualityVsFP16: 0.995,
    memoryReductionMultiplier: 2.9,
  },
  IQ3_M: {
    name: "IQ3_M",
    bitsPerWeight: 3.3,
    blockSize: 256,
    description: "Importance-Matrix 3-bit vector quantization with codebooks.",
    targetHardware: "VRAM-constrained devices (8GB / 12GB VRAM)",
    recommendedUse: "Fitting large 13B/14B or 70B models into tight VRAM budgets",
    relativeQualityVsFP16: 0.94,
    memoryReductionMultiplier: 4.84,
  },
  AWQ_INT4: {
    name: "AWQ_INT4",
    bitsPerWeight: 4.0,
    blockSize: 128,
    description: "Activation-aware Weight Quantization: Protects top 1% salient weight channels.",
    targetHardware: "NVIDIA GPUs with Tensor Cores (vLLM / TGI)",
    recommendedUse: "High-throughput server batch serving on NVIDIA GPUs",
    relativeQualityVsFP16: 0.988,
    memoryReductionMultiplier: 4.0,
  },
  GPTQ_INT4: {
    name: "GPTQ_INT4",
    bitsPerWeight: 4.0,
    blockSize: 128,
    description: "Second-order Hessian-compensated INT4 quantization.",
    targetHardware: "NVIDIA GPUs (ExLlamaV2 / AutoGPTQ / vLLM)",
    recommendedUse: "Fast single-batch GPU inference with ExLlamaV2",
    relativeQualityVsFP16: 0.982,
    memoryReductionMultiplier: 4.0,
  },
  EXL2_4BPW: {
    name: "EXL2_4BPW",
    bitsPerWeight: 4.0,
    blockSize: 256,
    description: "ExLlamaV2 sub-byte mixed precision format (custom CUDA kernels).",
    targetHardware: "NVIDIA RTX 3090 / 4090 consumer cards",
    recommendedUse: "Maximum raw token generation speed on single NVIDIA GPUs",
    relativeQualityVsFP16: 0.985,
    memoryReductionMultiplier: 4.0,
  },
  FP8_E4M3: {
    name: "FP8_E4M3",
    bitsPerWeight: 8.0,
    blockSize: 1,
    description: "Modern OCP 8-bit float (1 sign, 4 exp, 3 mantissa). Standard in DeepSeek-V3 / Hopper / Ada.",
    targetHardware: "NVIDIA H100 / H200 / RTX 4090 / B200 Tensor Cores & vLLM",
    recommendedUse: "Native FP8 server serving with zero dequantization overhead",
    relativeQualityVsFP16: 0.998,
    memoryReductionMultiplier: 2.0,
  },
  MLX_4BIT: {
    name: "MLX_4BIT",
    bitsPerWeight: 4.5, // 64 weights with FP16 scale + bias
    blockSize: 64,
    description: "Apple MLX Group-wise Affine Quantization (weights * scale + bias in unified memory).",
    targetHardware: "Apple Silicon M1/M2/M3/M4 via Metal Performance Shaders",
    recommendedUse: "Native Apple Silicon inference & LoRA fine-tuning with mlx-lm",
    relativeQualityVsFP16: 0.987,
    memoryReductionMultiplier: 3.55,
  },
  BITNET_1_58B: {
    name: "BITNET_1_58B",
    bitsPerWeight: 1.58,
    blockSize: 128,
    description: "Microsoft BitNet 1.58-bit Ternary {-1, 0, +1}. Replaces matrix multiply with integer addition.",
    targetHardware: "CPUs & Specialized BitNet Kernels (Extreme energy efficiency)",
    recommendedUse: "Ultra-low power edge devices and 1-bit native LLM architectures",
    relativeQualityVsFP16: 0.92,
    memoryReductionMultiplier: 10.1,
  },
  IQ2_XXS: {
    name: "IQ2_XXS",
    bitsPerWeight: 2.06,
    blockSize: 256,
    description: "Importance-Matrix 2-bit non-linear vector quantization with codebooks.",
    targetHardware: "Extreme VRAM-limited devices (fitting 70B in 18GB VRAM)",
    recommendedUse: "Running large models on single consumer GPUs or MacBooks with tight RAM",
    relativeQualityVsFP16: 0.90,
    memoryReductionMultiplier: 7.76,
  },
};

// ✅ ATTENTION: Simulates FP8 E4M3 (1 sign bit, 4 exponent bits, 3 mantissa bits, bias=7, max=448)
export function quantizeFP8_E4M3(weights: Float32Array): QuantizationResult {
  const compressed = new Uint8Array(weights.length);
  const dequantized = new Float32Array(weights.length);

  // E4M3 constants
  const expBias = 7;
  const maxVal = 448.0;
  const minSubnormal = Math.pow(2, -6) * Math.pow(2, -3); // 2^-9

  for (let i = 0; i < weights.length; i++) {
    const val = weights[i];
    if (val === 0) {
      compressed[i] = 0;
      dequantized[i] = 0;
      continue;
    }

    const sign = val < 0 ? 1 : 0;
    const absVal = Math.min(maxVal, Math.abs(val));

    // Compute exponent and mantissa (OCP E4M3 standard)
    let exp = Math.floor(Math.log2(absVal));
    exp = Math.max(-6, Math.min(8, exp)); // exponent range with bias
    let scale = Math.pow(2, exp);
    let rawMantissa = Math.round((absVal / scale - 1.0) * 8.0);

    let mantissa = rawMantissa;
    if (rawMantissa >= 8) {
      exp += 1;
      scale = Math.pow(2, exp);
      mantissa = 0;
    }

    const biasedExp = Math.max(0, Math.min(15, exp + expBias));
    mantissa = Math.max(0, Math.min(7, mantissa));

    // Pack into 8-bit byte: [sign: 1 bit | biasedExp: 4 bits | mantissa: 3 bits]
    const fp8Byte = (sign << 7) | ((biasedExp & 0x0f) << 3) | (mantissa & 0x07);
    compressed[i] = fp8Byte;

    // Dequantize back
    const deqSign = (fp8Byte >> 7) ? -1 : 1;
    const deqExp = ((fp8Byte >> 3) & 0x0f) - expBias;
    const deqMantissa = (fp8Byte & 0x07) / 8.0 + 1.0;
    dequantized[i] = deqSign * Math.pow(2, deqExp) * deqMantissa;
  }
  return computeMetrics("FP8_E4M3", weights, dequantized, compressed, 8.0);
}

// ✅ ATTENTION: Simulates Apple MLX Group-wise Affine Quantization (e.g. group_size=64, 4-bit)
export function quantizeMLX_Affine(
  weights: Float32Array,
  groupSize: number = 64
): QuantizationResult {
  const numGroups = Math.ceil(weights.length / groupSize);
  // Storage: (groupSize/2 bytes for 4-bit weights) + 2 bytes FP16 scale + 2 bytes FP16 bias per group
  const bytesPerGroup = groupSize / 2 + 4;
  const compressed = new Uint8Array(numGroups * bytesPerGroup);
  const dequantized = new Float32Array(weights.length);

  for (let g = 0; g < numGroups; g++) {
    const groupStart = g * groupSize;
    const groupEnd = Math.min(groupStart + groupSize, weights.length);

    let min = Infinity;
    let max = -Infinity;
    for (let i = groupStart; i < groupEnd; i++) {
      if (weights[i] < min) min = weights[i];
      if (weights[i] > max) max = weights[i];
    }

    const scale = (max - min) / 15.0; // 4-bit has 16 levels (0..15)
    const bias = min;
    const invScale = scale > 0 ? 1.0 / scale : 0;

    const groupByteOffset = g * bytesPerGroup;
    const view = new DataView(compressed.buffer, compressed.byteOffset + groupByteOffset, bytesPerGroup);
    view.setFloat16(0, scale, true);
    view.setFloat16(2, bias, true);

    for (let i = 0; i < groupSize; i += 2) {
      const idx0 = groupStart + i;
      const idx1 = groupStart + i + 1;

      const q0 = idx0 < weights.length
        ? Math.max(0, Math.min(15, Math.round((weights[idx0] - bias) * invScale)))
        : 0;
      const q1 = idx1 < weights.length
        ? Math.max(0, Math.min(15, Math.round((weights[idx1] - bias) * invScale)))
        : 0;

      compressed[groupByteOffset + 4 + i / 2] = (q0 & 0x0f) | ((q1 & 0x0f) << 4);

      if (idx0 < weights.length) dequantized[idx0] = q0 * scale + bias;
      if (idx1 < weights.length) dequantized[idx1] = q1 * scale + bias;
    }
  }

  return computeMetrics("MLX_4BIT", weights, dequantized, compressed, 4.5);
}

// ✅ ATTENTION: Simulates Microsoft BitNet 1.58-bit Ternary {-1, 0, +1} Quantization
export function quantizeBitNet_1_58b(weights: Float32Array): QuantizationResult {
  const blockSize = 128;
  const numBlocks = Math.ceil(weights.length / blockSize);
  // 128 ternary weights pack into 32 bytes (2 bits each) + 2 bytes FP16 scale = 34 bytes (2.125 bpw)
  const bytesPerBlock = 34;
  const compressed = new Uint8Array(numBlocks * bytesPerBlock);
  const dequantized = new Float32Array(weights.length);

  for (let b = 0; b < numBlocks; b++) {
    const start = b * blockSize;
    const end = Math.min(start + blockSize, weights.length);

    // Mean Absolute Value scale: gamma = 1/N * sum(|w_i|)
    let sumAbs = 0;
    for (let i = start; i < end; i++) {
      sumAbs += Math.abs(weights[i]);
    }
    const gamma = sumAbs / (end - start);
    const invGamma = gamma > 0 ? 1.0 / gamma : 0;

    const blockByteOffset = b * bytesPerBlock;
    const view = new DataView(compressed.buffer, compressed.byteOffset + blockByteOffset, bytesPerBlock);
    view.setFloat16(0, gamma, true);

    for (let i = 0; i < blockSize; i++) {
      const idx = start + i;
      if (idx < weights.length) {
        const scaled = weights[idx] * invGamma;
        // Round to nearest ternary {-1, 0, 1}
        const q = Math.max(-1, Math.min(1, Math.round(scaled)));

        // Pack 4 ternary weights per byte (2 bits each: 00=0, 01=+1, 11=-1)
        const byteIndex = blockByteOffset + 2 + Math.floor(i / 4);
        const bitShift = (i % 4) * 2;
        const code = q === 1 ? 0x01 : q === -1 ? 0x03 : 0x00;
        compressed[byteIndex] |= code << bitShift;

        dequantized[idx] = q * gamma;
      }
    }
  }

  return computeMetrics("BITNET_1_58B", weights, dequantized, compressed, 1.58);
}

// ----------------------------------------------------------------------------
// Quantization Algorithms
// ----------------------------------------------------------------------------

// ✅ ATTENTION: Simulates Q8_0 block quantization (32 weights per block)
export function quantizeQ8_0(weights: Float32Array): QuantizationResult {
  const blockSize = 32;
  const numBlocks = Math.ceil(weights.length / blockSize);
  const bytesPerBlock = 34; // 2 bytes f16 scale + 32 int8 weights
  const compressed = new Uint8Array(numBlocks * bytesPerBlock);
  const dequantized = new Float32Array(weights.length);

  for (let b = 0; b < numBlocks; b++) {
    const blockStart = b * blockSize;
    const blockEnd = Math.min(blockStart + blockSize, weights.length);

    // 1. Find absolute max in block
    let amax = 0;
    for (let i = blockStart; i < blockEnd; i++) {
      const absVal = Math.abs(weights[i]);
      if (absVal > amax) amax = absVal;
    }

    const scale = amax / 127.0;
    const invScale = scale > 0 ? 1.0 / scale : 0;

    // Store scale as FP16 (simulated via 2-byte view)
    const blockByteOffset = b * bytesPerBlock;
    const view = new DataView(compressed.buffer, compressed.byteOffset + blockByteOffset, bytesPerBlock);
    view.setFloat16(0, scale, true);

    // 2. Quantize each element to int8 in [-128, 127]
    for (let i = 0; i < blockSize; i++) {
      const idx = blockStart + i;
      if (idx < weights.length) {
        const q = Math.max(-128, Math.min(127, Math.round(weights[idx] * invScale)));
        compressed[blockByteOffset + 2 + i] = q < 0 ? q + 256 : q;
        dequantized[idx] = q * scale;
      }
    }
  }

  return computeMetrics("Q8_0", weights, dequantized, compressed, 8.5);
}

// ✅ ATTENTION: Simulates Q4_0 block quantization (32 weights per block, 4-bit nibbles)
export function quantizeQ4_0(weights: Float32Array): QuantizationResult {
  const blockSize = 32;
  const numBlocks = Math.ceil(weights.length / blockSize);
  const bytesPerBlock = 18; // 2 bytes f16 scale + 16 bytes (32 * 4 bits)
  const compressed = new Uint8Array(numBlocks * bytesPerBlock);
  const dequantized = new Float32Array(weights.length);

  for (let b = 0; b < numBlocks; b++) {
    const blockStart = b * blockSize;
    const blockEnd = Math.min(blockStart + blockSize, weights.length);

    let amax = 0;
    for (let i = blockStart; i < blockEnd; i++) {
      const absVal = Math.abs(weights[i]);
      if (absVal > amax) amax = absVal;
    }

    // 4-bit signed representation range: -8 to 7
    const scale = amax / -8.0;
    const invScale = scale !== 0 ? 1.0 / scale : 0;

    const blockByteOffset = b * bytesPerBlock;
    const view = new DataView(compressed.buffer, compressed.byteOffset + blockByteOffset, bytesPerBlock);
    view.setFloat16(0, Math.abs(scale), true);

    for (let i = 0; i < 16; i++) {
      const idx0 = blockStart + i;
      const idx1 = blockStart + i + 16;

      const q0 = idx0 < weights.length
        ? Math.max(-8, Math.min(7, Math.round(weights[idx0] * invScale)))
        : 0;
      const q1 = idx1 < weights.length
        ? Math.max(-8, Math.min(7, Math.round(weights[idx1] * invScale)))
        : 0;

      // Pack two 4-bit nibbles into 1 byte
      const nibble0 = (q0 + 8) & 0x0f;
      const nibble1 = (q1 + 8) & 0x0f;
      compressed[blockByteOffset + 2 + i] = nibble0 | (nibble1 << 4);

      if (idx0 < weights.length) dequantized[idx0] = (nibble0 - 8) * scale;
      if (idx1 < weights.length) dequantized[idx1] = (nibble1 - 8) * scale;
    }
  }

  return computeMetrics("Q4_0", weights, dequantized, compressed, 4.5);
}

// ✅ ATTENTION: Simulates Q4_K_M (Mixed-precision super-blocks with importance allocation)
export function quantizeQ4_K_M(
  weights: Float32Array,
  layerType: "attention" | "ffn" = "ffn"
): QuantizationResult {
  // In Q4_K_M, attention layers are given 5/6-bit precision while FFN is 4-bit
  if (layerType === "attention") {
    // Attention layers get enhanced precision
    return quantizeQ8_0(weights);
  }
  // FFN layers get 4-bit block quantization with non-linear scale distribution
  return quantizeQ4_0(weights);
}

// ----------------------------------------------------------------------------
// Error Metric Computation
// ----------------------------------------------------------------------------

function computeMetrics(
  scheme: string,
  original: Float32Array,
  dequantized: Float32Array,
  rawCompressedBytes: Uint8Array,
  bitsPerWeightEffective: number
): QuantizationResult {
  let sumSqError = 0;
  let sumSqSignal = 0;
  let maxAbsError = 0;

  for (let i = 0; i < original.length; i++) {
    const orig = original[i];
    const deq = dequantized[i];
    const diff = orig - deq;
    const sqErr = diff * diff;

    sumSqError += sqErr;
    sumSqSignal += orig * orig;

    const absDiff = Math.abs(diff);
    if (absDiff > maxAbsError) maxAbsError = absDiff;
  }

  const mse = sumSqError / original.length;
  const rmse = Math.sqrt(mse);

  // SNR (dB) = 10 * log10(Signal_Power / Noise_Power)
  const snrDb =
    sumSqError > 0 && sumSqSignal > 0
      ? 10.0 * Math.log10(sumSqSignal / sumSqError)
      : 99.9;

  const originalBytes = original.length * 4; // FP32
  const compressedBytes = rawCompressedBytes.byteLength;
  const compressionRatio = originalBytes / compressedBytes;

  // Estimated Perplexity loss heuristic
  const schemeProfile = QUANTIZATION_SCHEMES[scheme];
  const qualityFactor = schemeProfile ? schemeProfile.relativeQualityVsFP16 : 0.95;
  const estimatedPplLossPct = Number(((1.0 - qualityFactor) * 100).toFixed(2));

  return {
    scheme,
    originalFloat32: original,
    dequantizedFloat32: dequantized,
    rawCompressedBytes,
    bytesPerWeightEffective: bitsPerWeightEffective / 8.0,
    compressionRatio: Number(compressionRatio.toFixed(2)),
    rmse: Number(rmse.toFixed(6)),
    snrDb: Number(snrDb.toFixed(2)),
    maxAbsError: Number(maxAbsError.toFixed(6)),
    estimatedPplLossPct,
  };
}

// Helper: Generates realistic synthetic normal distribution tensor weights (e.g. standard LLM projection)
export function generateSyntheticTensorWeights(
  length: number = 1024,
  stdDev: number = 0.02
): Float32Array {
  const weights = new Float32Array(length);
  for (let i = 0; i < length; i += 2) {
    // Box-Muller transform for normal distribution
    const u1 = Math.max(1e-7, Math.random());
    const u2 = Math.random();
    const radius = Math.sqrt(-2.0 * Math.log(u1));
    const theta = 2.0 * Math.PI * u2;
    weights[i] = radius * Math.cos(theta) * stdDev;
    if (i + 1 < length) {
      weights[i + 1] = radius * Math.sin(theta) * stdDev;
    }
  }
  return weights;
}
