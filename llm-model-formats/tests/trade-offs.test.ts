// ============================================================================
// TESTS: TRADE-OFF ANALYZER & HARDWARE SIZING
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  calculateVRAMBudget,
  estimateInferenceThroughput,
  CANONICAL_MODELS,
  CANONICAL_HARDWARE,
} from "../src/formats/trade-off-analyzer.js";
import { evaluateFormatRecommendation } from "../src/visualizer/decision-tree.js";

describe("Trade-Off Analyzer & Decision Tree", () => {
  it("calculates VRAM budget accurately for Llama-3-8B in FP16 vs Q4_K_M", () => {
    const llama8B = CANONICAL_MODELS["Llama-3-8B"];

    const fp16Budget = calculateVRAMBudget({
      model: llama8B,
      quantizationScheme: "F16",
      contextTokens: 8192,
      availableVRAMGB: 24,
    });

    const q4kmBudget = calculateVRAMBudget({
      model: llama8B,
      quantizationScheme: "Q4_K_M",
      contextTokens: 8192,
      availableVRAMGB: 8,
    });

    expect(fp16Budget.weightsMemoryGB).toBeGreaterThan(14.0);
    expect(q4kmBudget.weightsMemoryGB).toBeLessThan(5.0);
    expect(q4kmBudget.canFitInVRAM).toBe(true);
    expect(q4kmBudget.offloadLayersRecommended).toBe(32); // All 32 layers fit in 8GB
  });

  it("calculates KV cache scaling for long context windows (128k tokens)", () => {
    const llama8B = CANONICAL_MODELS["Llama-3-8B"];

    const shortCtx = calculateVRAMBudget({
      model: llama8B,
      quantizationScheme: "Q4_K_M",
      contextTokens: 8192,
    });

    const longCtx = calculateVRAMBudget({
      model: llama8B,
      quantizationScheme: "Q4_K_M",
      contextTokens: 131072,
    });

    // 128k context has 16x larger KV cache than 8k
    expect(longCtx.kvCacheTotalGB).toBeCloseTo(shortCtx.kvCacheTotalGB * 16, 0);
    expect(longCtx.kvCacheTotalGB).toBeGreaterThan(15.0);
  });

  it("estimates theoretical memory-bandwidth bound throughput", () => {
    const llama8B = CANONICAL_MODELS["Llama-3-8B"];
    const m4Pro = CANONICAL_HARDWARE["Apple M4 Pro (Unified Memory)"];

    const throughput = estimateInferenceThroughput({
      model: llama8B,
      quantizationScheme: "Q4_K_M",
      hardware: m4Pro,
    });

    expect(throughput.theoreticalTokensPerSecond).toBeGreaterThan(45);
    expect(throughput.limitingFactor).toBe("MEMORY_BANDWIDTH");
  });

  it("evaluates decision recommendations for different target setups", () => {
    const appleRecommendation = evaluateFormatRecommendation({
      hardware: "apple_silicon",
      purpose: "local_chat",
      framework: "ollama_llamacpp",
    });
    expect(appleRecommendation.primaryFormat).toContain("GGUF");

    const vllmRecommendation = evaluateFormatRecommendation({
      hardware: "nvidia_gpu",
      purpose: "high_throughput_serving",
      framework: "vllm_sglang",
    });
    expect(vllmRecommendation.primaryFormat).toContain("SafeTensors");
    expect(vllmRecommendation.recommendedQuantization).toContain("AWQ");

    const exl2Recommendation = evaluateFormatRecommendation({
      hardware: "nvidia_gpu",
      purpose: "max_speed_single_gpu",
      framework: "exllamav2",
    });
    expect(exl2Recommendation.primaryFormat).toContain("EXL2");
  });
});
