// ============================================================================
// ASCII VISUALIZER: BINARY LAYOUTS, HEX DUMPS & TAXONOMY TABLES
// ============================================================================

import { MODEL_FORMAT_PROFILES } from "../formats/format-registry.js";
import { QUANTIZATION_SCHEMES } from "../formats/quantization-engine.js";

// ✅ ATTENTION: Renders ASCII layout blueprints contrasting GGUF, SafeTensors, and PyTorch Pickle
export function renderBinaryLayoutComparison(): string {
  return `
========================================================================================================
                                LLM MODEL FORMAT BINARY STRUCTURES COMPARED
========================================================================================================

1. GGUF (GPT-Generated Unified Format - Single-File Self-Contained Container)
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [0x00] MAGIC "GGUF" (0x46554747) | [0x04] VERSION (v3) | [0x08] TENSOR_COUNT | [0x10] KV_COUNT      │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ KEY-VALUE METADATA STORE (Self-Contained Model Spec + Tokenizer + Architecture Hyperparams):         │
│   • "general.architecture"    -> "llama" / "mistral" / "qwen2"                                       │
│   • "llama.context_length"    -> 8192 / 32768 / 131072                                               │
│   • "llama.attention.head_count_kv" -> 8 (GQA ratio)                                                 │
│   • "tokenizer.ggml.tokens"   -> Full Vocabulary Array (e.g. 128,256 tokens)                         │
│   • "tokenizer.chat_template" -> Jinja2 System & Role Prompt Template                                │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ TENSOR INFO TABLE (Array of Tensor Descriptors):                                                     │
│   • Name (e.g. "blk.0.attn_q.weight") | Shape [4096, 4096] | Type (Q4_K / Q8_0) | Data Offset       │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PADDING TO ALIGNMENT BOUNDARY (Default 32 bytes for SIMD AVX-512 / ARM NEON / Apple Metal mmap)     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ RAW TENSOR DATA PAYLOAD:                                                                             │
│   [Tensor 0: Q4_K super-blocks] [Tensor 1: Q5_K] ... [Tensor N: Q6_K output head]                    │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

2. SAFETENSORS (Hugging Face Zero-Copy Buffer - Safe & Fast, Multi-File Setup)
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [0x00..0x07] 8-Byte Little-Endian Uint64: Header Length N (e.g. 14,820 bytes)                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [0x08..0x08+N] UTF-8 JSON HEADER (Pure Declarative Data, Zero Executable Code):                      │
│   {                                                                                                  │
│     "model.layers.0.self_attn.q_proj.weight": { "dtype": "BF16", "shape": [4096, 4096],              │
│                                                 "data_offsets": [0, 33554432] },                     │
│     "__metadata__": { "format": "pt" }                                                               │
│   }                                                                                                  │
│   ⚠️ NOTE: Tokenizer and architecture MUST live in external tokenizer.json and config.json           │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [0x08+N..EOF] RAW CONTIGUOUS TENSOR BYTES (Zero-Copy direct memory-mapped into GPU/RAM)              │
│   [Raw byte stream matching exact data_offsets specified in JSON header]                             │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

3. PYTORCH PICKLE (.pt / .bin / .pth - Legacy Python Object Graph Serialization)
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [0x00] PROTOCOL 2/4/5 (0x80 0x02)                                                                    │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PYTHON VM BYTECODE OPCODES (Stack-Based Virtual Machine Instructions):                               │
│   [c: GLOBAL] "torch._utils._rebuild_tensor_v2"                                                      │
│   [q: BINPUT] [X: BINUNICODE] "model.layers.0.weight"                                                │
│   [R: REDUCE] -> Instantiates Python Class / Executes Callable Function                             │
│   ⚠️ CRITICAL SECURITY HAZARD: An attacker can substitute GLOBAL "os.system" with REDUCE             │
│      which triggers ARBITRARY COMMAND EXECUTION the instant torch.load() is invoked!                │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ PICKLE DATA STORAGE (Incurs 2x-3x RAM duplication during unpickling deserialization)                 │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
`;
}

// ✅ ATTENTION: Formats raw bytes into a clean terminal hex dump
export function renderHexDump(buffer: Uint8Array, maxBytes: number = 96, title?: string): string {
  const lines: string[] = [];
  if (title) {
    lines.push(`--- [ HEX DUMP: ${title} ] ${"-".repeat(Math.max(2, 60 - title.length))}`);
  }

  const length = Math.min(buffer.byteLength, maxBytes);
  for (let offset = 0; offset < length; offset += 16) {
    const chunk = buffer.subarray(offset, Math.min(offset + 16, length));
    const hexParts: string[] = [];
    const asciiParts: string[] = [];

    for (let i = 0; i < 16; i++) {
      if (i < chunk.length) {
        const b = chunk[i];
        hexParts.push(b.toString(16).padStart(2, "0"));
        asciiParts.push(b >= 32 && b <= 126 ? String.fromCharCode(b) : ".");
      } else {
        hexParts.push("  ");
      }
    }

    const offsetHex = offset.toString(16).padStart(4, "0");
    const hexStr = hexParts.slice(0, 8).join(" ") + "  " + hexParts.slice(8, 16).join(" ");
    const asciiStr = asciiParts.join("");
    lines.push(`  0x${offsetHex} | ${hexStr.padEnd(48)} | ${asciiStr}`);
  }

  if (buffer.byteLength > maxBytes) {
    lines.push(`  ... (${buffer.byteLength - maxBytes} more bytes elided)`);
  }

  return lines.join("\n");
}

// ✅ ATTENTION: Renders complete format comparison matrix
export function renderFormatComparisonTable(): string {
  const rows = Object.values(MODEL_FORMAT_PROFILES);
  const lines: string[] = [];

  lines.push("=".repeat(110));
  lines.push("                          AI MODEL FORMATS: MASTER ARCHITECTURAL MATRIX");
  lines.push("=".repeat(110));
  lines.push(
    "| Format Key        | Category                | Security Risk | Single-File? | mmap? | Primary Target Runtime   |"
  );
  lines.push(
    "|-------------------|-------------------------|---------------|--------------|-------|--------------------------|"
  );

  for (const r of rows) {
    const key = r.id.toUpperCase().padEnd(17);
    const cat = r.category.slice(0, 23).padEnd(23);
    const sec = r.securityRisk === "SAFE" ? "✅ Safe       " : "❌ Dangerous  ";
    const single = (r.isSingleFileSelfContained ? "Yes (All-in-1)" : "No (Multi-file)").padEnd(12);
    const mmap = (r.supportsMmap ? "Yes (Zero-cpy)" : "No (Memory cp)").padEnd(5);
    const runtime = r.primaryEcosystem.split("/")[0].trim().slice(0, 24).padEnd(24);

    lines.push(`| ${key} | ${cat} | ${sec} | ${single} | ${mmap} | ${runtime} |`);
  }
  lines.push("=".repeat(110));

  return lines.join("\n");
}

// ✅ ATTENTION: Renders quantization comparison table
export function renderQuantizationComparisonChart(): string {
  const lines: string[] = [];
  lines.push("\n" + "=".repeat(90));
  lines.push("                 QUANTIZATION SCHEMES: SIZE, QUALITY & HARDWARE FIT");
  lines.push("=".repeat(90));
  lines.push(
    "| Scheme   | Bits/W | 8B VRAM  | Quality % | VRAM Saving | Best Hardware & Engine           |"
  );
  lines.push(
    "|----------|--------|----------|-----------|-------------|----------------------------------|"
  );

  for (const [key, q] of Object.entries(QUANTIZATION_SCHEMES)) {
    const name = key.padEnd(8);
    const bpw = `${q.bitsPerWeight.toFixed(1)}`.padEnd(6);
    const vram8b = `${(8.03 * (q.bitsPerWeight / 8.0)).toFixed(1)} GB`.padEnd(8);
    const qual = `${(q.relativeQualityVsFP16 * 100).toFixed(1)}%`.padEnd(9);
    const saving = `${q.memoryReductionMultiplier.toFixed(1)}x`.padEnd(11);
    const hw = q.targetHardware.slice(0, 32).padEnd(32);

    lines.push(`| ${name} | ${bpw} | ${vram8b} | ${qual} | ${saving} | ${hw} |`);
  }
  lines.push("=".repeat(90));
  return lines.join("\n");
}
