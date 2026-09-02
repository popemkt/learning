// ============================================================================
// TESTS: GGUF PARSER & SERIALIZER
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  GGUF_MAGIC,
  GGUF_VERSION_V3,
  GGUFType,
  GGUFMetadataValueType,
} from "../src/types.js";
import {
  parseGGUF,
  serializeGGUF,
  calculateTensorByteSize,
} from "../src/binary/gguf-parser.js";

describe("GGUF Binary Parser & Serializer", () => {
  it("serializes and parses a valid GGUF v3 file with rich metadata", () => {
    const rawData1 = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const rawData2 = new Uint8Array([10, 20, 30, 40]);

    const serialized = serializeGGUF({
      metadata: {
        "general.architecture": {
          type: GGUFMetadataValueType.STRING,
          value: "llama",
        },
        "general.name": {
          type: GGUFMetadataValueType.STRING,
          value: "Test-Llama-Model",
        },
        "llama.context_length": {
          type: GGUFMetadataValueType.UINT32,
          value: 4096,
        },
        "llama.attention.head_count": {
          type: GGUFMetadataValueType.UINT32,
          value: 32,
        },
        "tokenizer.ggml.tokens": {
          type: GGUFMetadataValueType.ARRAY,
          value: ["<s>", "</s>", "hello", "world"],
        },
        "general.is_quantized": {
          type: GGUFMetadataValueType.BOOL,
          value: true,
        },
      },
      tensors: [
        {
          name: "blk.0.attn_q.weight",
          dimensions: [32, 1],
          type: GGUFType.Q4_K,
          data: rawData1,
        },
        {
          name: "blk.0.attn_v.weight",
          dimensions: [32, 1],
          type: GGUFType.Q8_0,
          data: rawData2,
        },
      ],
      alignment: 32,
    });

    expect(serialized.byteLength).toBeGreaterThan(0);

    const parsed = parseGGUF(serialized);
    expect(parsed.header.magic).toBe(GGUF_MAGIC);
    expect(parsed.header.version).toBe(GGUF_VERSION_V3);
    expect(parsed.header.tensorCount).toBe(2);
    expect(parsed.header.metadataKVCount).toBe(6);

    // Verify metadata
    expect(parsed.header.metadata["general.architecture"]?.value).toBe("llama");
    expect(parsed.header.metadata["general.name"]?.value).toBe("Test-Llama-Model");
    expect(parsed.header.metadata["llama.context_length"]?.value).toBe(4096);
    expect(parsed.header.metadata["tokenizer.ggml.tokens"]?.value).toEqual([
      "<s>",
      "</s>",
      "hello",
      "world",
    ]);
    expect(parsed.header.metadata["general.is_quantized"]?.value).toBe(true);

    // Verify tensors
    expect(parsed.header.tensors.length).toBe(2);
    expect(parsed.header.tensors[0].name).toBe("blk.0.attn_q.weight");
    expect(parsed.header.tensors[0].type).toBe(GGUFType.Q4_K);
    expect(parsed.header.tensors[1].name).toBe("blk.0.attn_v.weight");
    expect(parsed.header.tensors[1].type).toBe(GGUFType.Q8_0);

    // Verify alignment
    expect(parsed.tensorDataOffset % 32).toBe(0);

    // Verify tensor data payloads
    const payload1 = parsed.tensorsData.get("blk.0.attn_q.weight");
    expect(payload1).toBeDefined();
    expect(payload1?.subarray(0, 8)).toEqual(rawData1);
  });

  it("throws descriptive error when reading non-GGUF magic buffer", () => {
    const invalidBuffer = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);
    expect(() => parseGGUF(invalidBuffer)).toThrow(/Invalid GGUF magic header/);
  });

  it("calculates tensor byte sizes accurately for different quantization types", () => {
    // 32 elements of Q4_0 -> 1 block of 32 weights = 18 bytes (2 byte scale + 16 byte nibbles)
    const q4_0Size = calculateTensorByteSize([32], GGUFType.Q4_0);
    expect(q4_0Size).toBe(18);

    // 256 elements of Q4_K -> 1 super-block = 144 bytes
    const q4_kSize = calculateTensorByteSize([256], GGUFType.Q4_K);
    expect(q4_kSize).toBe(144);

    // 1024 elements of F32 -> 1024 * 4 = 4096 bytes
    const f32Size = calculateTensorByteSize([1024], GGUFType.F32);
    expect(f32Size).toBe(4096);

    // 1024 elements of F16 -> 1024 * 2 = 2048 bytes
    const f16Size = calculateTensorByteSize([1024], GGUFType.F16);
    expect(f16Size).toBe(2048);
  });
});
