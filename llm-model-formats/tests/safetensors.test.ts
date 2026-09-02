// ============================================================================
// TESTS: SAFETENSORS PARSER & SERIALIZER
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  parseSafeTensors,
  serializeSafeTensors,
  getSafeTensorsDTypeByteSize,
} from "../src/binary/safetensors-parser.js";

describe("SafeTensors Binary Parser & Serializer", () => {
  it("serializes and parses SafeTensors buffer with zero-copy slicing", () => {
    const rawTensor1 = new Uint8Array([10, 20, 30, 40]);
    const rawTensor2 = new Uint8Array([100, 200, 255]);

    const serialized = serializeSafeTensors({
      metadata: {
        format: "pt",
        producer: "unit-tests",
      },
      tensors: [
        {
          name: "model.embed_tokens.weight",
          dtype: "F32",
          shape: [1, 1],
          data: rawTensor1,
        },
        {
          name: "model.norm.weight",
          dtype: "U8",
          shape: [3],
          data: rawTensor2,
        },
      ],
    });

    const parsed = parseSafeTensors(serialized);

    expect(parsed.totalFileSize).toBe(serialized.byteLength);
    expect(parsed.headerSizeBytes).toBeGreaterThan(0);
    expect(parsed.dataBlockOffset).toBe(8 + parsed.headerSizeBytes);

    // Verify metadata
    expect(parsed.metadata).toEqual({
      format: "pt",
      producer: "unit-tests",
    });

    // Verify tensor descriptors
    expect(parsed.tensors.length).toBe(2);
    expect(parsed.tensors[0].name).toBe("model.embed_tokens.weight");
    expect(parsed.tensors[0].type).toBe("F32");
    expect(parsed.tensors[0].sizeBytes).toBe(4);

    expect(parsed.tensors[1].name).toBe("model.norm.weight");
    expect(parsed.tensors[1].type).toBe("U8");
    expect(parsed.tensors[1].sizeBytes).toBe(3);

    // Verify raw tensor data slices
    const slice1 = parsed.tensorsData.get("model.embed_tokens.weight");
    expect(slice1).toEqual(rawTensor1);

    const slice2 = parsed.tensorsData.get("model.norm.weight");
    expect(slice2).toEqual(rawTensor2);
  });

  it("throws error when buffer is too small for 8-byte header size", () => {
    const tooSmall = new Uint8Array([1, 2, 3]);
    expect(() => parseSafeTensors(tooSmall)).toThrow(/smaller than the minimum 8-byte header/);
  });

  it("computes dtype byte sizes correctly", () => {
    expect(getSafeTensorsDTypeByteSize("F64")).toBe(8);
    expect(getSafeTensorsDTypeByteSize("F32")).toBe(4);
    expect(getSafeTensorsDTypeByteSize("BF16")).toBe(2);
    expect(getSafeTensorsDTypeByteSize("F16")).toBe(2);
    expect(getSafeTensorsDTypeByteSize("I8")).toBe(1);
    expect(getSafeTensorsDTypeByteSize("U8")).toBe(1);
    expect(getSafeTensorsDTypeByteSize("BOOL")).toBe(1);
  });
});
