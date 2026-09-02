// ============================================================================
// DECISION TREE: INTERACTIVE FORMAT SELECTION ENGINE
// ============================================================================

export interface DecisionQuery {
  hardware: "apple_silicon" | "nvidia_gpu" | "cpu_only" | "edge_mobile_web";
  purpose: "local_chat" | "high_throughput_serving" | "training_finetuning" | "max_speed_single_gpu" | "apple_silicon_native_lora" | "native_fp8_serving";
  framework: "ollama_llamacpp" | "vllm_sglang" | "transformers_hf" | "exllamav2" | "onnx_webgpu" | "mlx_apple";
}

export interface RecommendationResult {
  primaryFormat: string;
  recommendedQuantization: string;
  runnerFramework: string;
  rationale: string;
  pros: string[];
  cons: string[];
  safetyNote: string;
}

// ✅ ATTENTION: Algorithmic decision guide determining the optimal model format
export function evaluateFormatRecommendation(query: DecisionQuery): RecommendationResult {
  // Scenario 1: Apple Silicon Native Development / Fine-tuning (Apple MLX)
  if (query.purpose === "apple_silicon_native_lora" || query.framework === "mlx_apple") {
    return {
      primaryFormat: "Apple MLX SafeTensors (.safetensors)",
      recommendedQuantization: "MLX 4-bit (affine group-wise) or BF16",
      runnerFramework: "Apple MLX / mlx-lm / mlx-community",
      rationale:
        "MLX is Apple's native framework designed from the ground up for Apple Silicon unified memory. It allows full local LoRA fine-tuning and high-speed generation with Metal Performance Shaders without Python/PyTorch memory bloat.",
      pros: [
        "Native unified memory arrays (zero copying between CPU and GPU)",
        "Full local fine-tuning (LoRA / QLoRA) directly on MacBook Pro / Mac Studio",
        "High generation speed matching or beating llama.cpp on M3/M4 chips",
      ],
      cons: [
        "Strictly locked to macOS / Apple Silicon (will not run on Linux/CUDA)",
      ],
      safetyNote: "✅ SAFE: Pure SafeTensors format with declarative weights.",
    };
  }

  // Scenario 2: Apple Silicon or CPU or Ollama / llama.cpp
  if (
    query.hardware === "apple_silicon" ||
    query.hardware === "cpu_only" ||
    query.framework === "ollama_llamacpp"
  ) {
    return {
      primaryFormat: "GGUF (.gguf)",
      recommendedQuantization: "Q4_K_M (or Q5_K_M for coding/reasoning)",
      runnerFramework: "llama.cpp / Ollama / LM Studio",
      rationale:
        "GGUF is the undisputed standard for local CPU and Apple Silicon unified memory execution. It packages weights, metadata, tokenizer, and chat templates in one single file with optimized SIMD and Metal kernels.",
      pros: [
        "Single-file distribution (no missing tokenizer.json or config.json)",
        "Zero-copy Metal & CPU mmap offloading",
        "K-quants retain 98.5%+ FP16 quality at 4.5 bits/weight",
        "Supports hybrid CPU+GPU layer offloading (-ngl)",
      ],
      cons: [
        "Not optimized for high-concurrency continuous batching servers (vLLM)",
        "Not designed for multi-GPU distributed tensor-parallel training",
      ],
      safetyNote: "✅ SAFE: Pure declarative binary layout with zero arbitrary code execution risk.",
    };
  }

  // Scenario 2: High throughput batched server inference on NVIDIA GPUs (vLLM / SGLang)
  if (query.purpose === "high_throughput_serving" || query.framework === "vllm_sglang") {
    return {
      primaryFormat: "SafeTensors (.safetensors) with AWQ or FP8",
      recommendedQuantization: "AWQ INT4 (or native FP8 on Hopper/Ada)",
      runnerFramework: "vLLM / SGLang / TGI",
      rationale:
        "vLLM and enterprise inference engines use SafeTensors for zero-copy GPU memory mapping, PagedAttention KV caching, and Tensor Core-accelerated INT4 GEMM kernels.",
      pros: [
        "Maximum batched serving throughput and continuous batching",
        "Tensor-parallelism across multi-GPU nodes (2x, 4x, 8x GPUs)",
        "AWQ protects the 1% most salient weight channels",
      ],
      cons: [
        "Requires multi-file bundle (model.safetensors + config.json + tokenizer.json)",
        "Inefficient on CPU-only machines",
      ],
      safetyNote: "✅ SAFE: Hugging Face zero-copy format without executable bytecode.",
    };
  }

  // Scenario 3: Maximum single-user speed on consumer NVIDIA GPUs (RTX 3090 / 4090)
  if (query.purpose === "max_speed_single_gpu" || query.framework === "exllamav2") {
    return {
      primaryFormat: "EXL2 or GPTQ (in SafeTensors)",
      recommendedQuantization: "EXL2 4.0 bpw (or GPTQ INT4)",
      runnerFramework: "ExLlamaV2 / TabbyAPI",
      rationale:
        "ExLlamaV2 features hand-written CUDA kernels tuned for consumer NVIDIA hardware, achieving the highest possible tokens-per-second generation rates for single-user workflows.",
      pros: [
        "Fastest generation speed on single NVIDIA GPUs (150+ tokens/sec on RTX 4090)",
        "Fine-grained sub-byte precision (e.g. 3.5 to 6.0 bpw)",
      ],
      cons: [
        "Strictly NVIDIA CUDA dependent (does not run on Apple Silicon or AMD)",
        "Not standard for distributed enterprise clusters",
      ],
      safetyNote: "✅ SAFE: Wrapped in SafeTensors container.",
    };
  }

  // Scenario 4: Edge / Mobile / Web browser
  if (query.hardware === "edge_mobile_web" || query.framework === "onnx_webgpu") {
    return {
      primaryFormat: "ONNX (.onnx) or WebGPU SafeTensors",
      recommendedQuantization: "INT8 Dynamic or INT4",
      runnerFramework: "ONNX Runtime / Transformers.js",
      rationale:
        "ONNX and WebGPU SafeTensors run seamlessly inside web browsers, mobile apps, and Windows DirectML environments without requiring a local Python or CUDA stack.",
      pros: [
        "Runs directly in the browser via WebGPU / WebAssembly",
        "Cross-platform hardware acceleration (DirectML, CoreML, WebNN)",
      ],
      cons: [
        "Graph conversion overhead and slower generation for large 70B+ models",
      ],
      safetyNote: "✅ SAFE: Graph specification format without arbitrary code execution.",
    };
  }

  // Default / Training / Fine-tuning
  return {
    primaryFormat: "SafeTensors (.safetensors)",
    recommendedQuantization: "BF16 / FP16 (or BitsAndBytes NF4 via QLoRA)",
    runnerFramework: "Hugging Face Transformers / PyTorch / Axolotl / Unsloth",
    rationale:
      "SafeTensors is the universal gold standard for model weights in research, fine-tuning, and model sharing. It replaces dangerous PyTorch pickle files while preserving full floating-point precision.",
    pros: [
      "Zero-copy mmap loading (10x faster startup than PyTorch pickle)",
      "Universal compatibility with Hugging Face ecosystem",
      "Safe against remote code execution exploits",
    ],
    cons: [
      "Large file size for unquantized models (~16GB for 8B model)",
    ],
    safetyNote: "✅ SAFE: 100% safe replacement for legacy .pt/.bin pickle checkpoints.",
  };
}

// ✅ ATTENTION: Renders ASCII decision flowchart
export function renderDecisionFlowchart(): string {
  return `
========================================================================================================
                                LLM FORMAT SELECTION DECISION FLOWCHART
========================================================================================================

                                  [ What is your primary deployment target? ]
                                                     │
      ┌───────────────────────┬──────────────────────┼───────────────────────┬──────────────────────┐
      ▼                       ▼                      ▼                       ▼                      ▼
  [ Local Consumer Chat ] [ Mac Native MLX ]    [ Enterprise Server GPU ] [ Single NVIDIA Speed ] [ Research / Train ]
  • Ollama / llama.cpp    • Apple M-series      • NVIDIA H100/A100/B200   • RTX 3090 / 4090       • LoRA / HuggingFace
  • CPU / Metal           • mlx-lm / LoRA fine  • vLLM / SGLang / TGI     • ExLlamaV2             • Axolotl / Unsloth
      │                       │                      │                       │                      │
      ▼                       ▼                      ▼                       ▼                      ▼
  ⭐ GGUF                 ⭐ MLX SAFETENSORS    ⭐ SAFETENSORS (FP8/AWQ) ⭐ EXL2 / GPTQ         ⭐ SAFETENSORS (BF16)
 (Q4_K_M / Q5_K_M)       (4-bit affine / BF16)  (Native FP8 / INT4 AWQ)  (4.0 bpw sub-byte)     (Universal standard)
      │                       │                      │                       │                      │
  ┌───┴──────────────┐    ┌───┴──────────────┐   ┌───┴──────────────┐    ┌───┴──────────────┐   ┌───┴──────────────┐
  │ • Single file    │    │ • Metal native   │   │ • PagedAttention │    │ • Custom CUDA    │   │ • Zero-copy mmap │
  │ • Aligned mmap   │    │ • Native fine-tun│   │ • Tensor-parallel│    │ • 150+ tokens/s  │   │ • Safe (No RCE)  │
  └──────────────────┘    └──────────────────┘   └──────────────────┘    └──────────────────┘   └──────────────────┘
`;
}
