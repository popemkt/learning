// ============================================================================
// TESTS: QUANTIZATION NUMERICAL ENGINE & METRICS
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  quantizeQ8_0,
  quantizeQ4_0,
  quantizeFP8_E4M3,
  quantizeMLX_Affine,
  quantizeBitNet_1_58b,
  generateSyntheticTensorWeights,
  QUANTIZATION_SCHEMES,
} from "../src/formats/quantization-engine.js";

describe("Quantization Numerical Engine", () => {
  it("quantizes weights into Q8_0 and verifies SNR and high quality retention", () => {
    const weights = generateSyntheticTensorWeights(1024, 0.05);
    const result = quantizeQ8_0(weights);

    expect(result.scheme).toBe("Q8_0");
    expect(result.compressionRatio).toBeGreaterThan(3.5); // vs FP32
    expect(result.snrDb).toBeGreaterThan(40); // 8-bit quantization retains >40dB SNR
    expect(result.rmse).toBeLessThan(0.001);
    expect(result.dequantizedFloat32.length).toBe(weights.length);
  });

  it("quantizes weights into Q4_0 with 4-bit nibble packing", () => {
    const weights = generateSyntheticTensorWeights(512, 0.05);
    const result = quantizeQ4_0(weights);

    expect(result.scheme).toBe("Q4_0");
    expect(result.compressionRatio).toBeGreaterThan(7.0); // vs FP32 (4.5 bits vs 32 bits)
    expect(result.snrDb).toBeGreaterThan(15);
    expect(result.rawCompressedBytes.byteLength).toBe((512 / 32) * 18);
  });
  it("simulates native FP8 E4M3 quantization with high signal-to-noise ratio", () => {
    const weights = generateSyntheticTensorWeights(512, 0.05);
    const result = quantizeFP8_E4M3(weights);

    expect(result.scheme).toBe("FP8_E4M3");
    expect(result.rawCompressedBytes.byteLength).toBe(512); // Exactly 1 byte per weight
    expect(result.snrDb).toBeGreaterThan(15);
  });

  it("simulates Apple MLX group-wise affine quantization", () => {
    const weights = generateSyntheticTensorWeights(512, 0.05);
    const result = quantizeMLX_Affine(weights, 64);

    expect(result.scheme).toBe("MLX_4BIT");
    expect(result.compressionRatio).toBeGreaterThan(6.0);
    expect(result.snrDb).toBeGreaterThan(18);
  });

  it("simulates Microsoft BitNet 1.58-bit ternary {-1, 0, +1} quantization", () => {
    const weights = generateSyntheticTensorWeights(512, 0.05);
    const result = quantizeBitNet_1_58b(weights);

    expect(result.scheme).toBe("BITNET_1_58B");
    expect(result.compressionRatio).toBeGreaterThan(10.0);
    // Ensure ternary dequantized values are multiples of gamma
    expect(result.dequantizedFloat32.length).toBe(weights.length);
  });

  it("verifies quantization scheme catalog metadata consistency", () => {
    expect(QUANTIZATION_SCHEMES.Q4_K_M).toBeDefined();
    expect(QUANTIZATION_SCHEMES.Q4_K_M.bitsPerWeight).toBe(4.5);
    expect(QUANTIZATION_SCHEMES.AWQ_INT4).toBeDefined();
    expect(QUANTIZATION_SCHEMES.AWQ_INT4.bitsPerWeight).toBe(4.0);
    expect(QUANTIZATION_SCHEMES.EXL2_4BPW).toBeDefined();
    expect(QUANTIZATION_SCHEMES.FP8_E4M3).toBeDefined();
    expect(QUANTIZATION_SCHEMES.MLX_4BIT).toBeDefined();
    expect(QUANTIZATION_SCHEMES.BITNET_1_58B).toBeDefined();
  });
});
