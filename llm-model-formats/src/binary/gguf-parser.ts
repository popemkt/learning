// ============================================================================
// GGUF (GPT-Generated Unified Format) BINARY PARSER & SERIALIZER
// ============================================================================

import { BinaryReader, BinaryWriter } from "./binary-reader.js";
import {
  GGUF_MAGIC,
  GGUF_VERSION_V3,
  GGUF_DEFAULT_ALIGNMENT,
  GGUFType,
  GGUFMetadataValueType,
  type GGUFHeader,
  type GGUFMetadataValue,
  type TensorInfo,
} from "../types.js";

// Helper: Calculate byte size per tensor element or block
export function getGGUFTypeSizeInfo(type: GGUFType): { blockSize: number; bytesPerBlock: number } {
  switch (type) {
    case GGUFType.F32:
    case GGUFType.I32:
      return { blockSize: 1, bytesPerBlock: 4 };
    case GGUFType.F16:
    case GGUFType.BF16:
    case GGUFType.I16:
      return { blockSize: 1, bytesPerBlock: 2 };
    case GGUFType.I8:
      return { blockSize: 1, bytesPerBlock: 1 };
    case GGUFType.F64:
    case GGUFType.I64:
      return { blockSize: 1, bytesPerBlock: 8 };
    // Block-quantized formats (32 weights per block in standard ggml quants)
    case GGUFType.Q4_0:
      return { blockSize: 32, bytesPerBlock: 18 }; // 2 bytes f16 scale + 16 bytes (32 * 4-bit)
    case GGUFType.Q4_1:
      return { blockSize: 32, bytesPerBlock: 20 }; // 2 bytes f16 scale + 2 bytes f16 min + 16 bytes
    case GGUFType.Q5_0:
      return { blockSize: 32, bytesPerBlock: 22 }; // 2 bytes f16 scale + 4 bytes high bits + 16 bytes low bits
    case GGUFType.Q8_0:
      return { blockSize: 32, bytesPerBlock: 34 }; // 2 bytes f16 scale + 32 bytes (32 * 8-bit)
    // K-Quants (256 weights per super-block)
    case GGUFType.Q4_K:
      return { blockSize: 256, bytesPerBlock: 144 }; // Super-block scales + 4-bit sub-blocks
    case GGUFType.Q5_K:
      return { blockSize: 256, bytesPerBlock: 176 };
    case GGUFType.Q6_K:
      return { blockSize: 256, bytesPerBlock: 210 };
    case GGUFType.Q2_K:
      return { blockSize: 256, bytesPerBlock: 84 };
    case GGUFType.Q3_K:
      return { blockSize: 256, bytesPerBlock: 110 };
    case GGUFType.Q8_K:
      return { blockSize: 256, bytesPerBlock: 292 };
    default:
      return { blockSize: 1, bytesPerBlock: 4 };
  }
}

// Calculate total raw bytes occupied by a tensor given its shape and dtype
export function calculateTensorByteSize(dimensions: number[], type: GGUFType): number {
  const totalElements = dimensions.reduce((acc, dim) => acc * dim, 1);
  const { blockSize, bytesPerBlock } = getGGUFTypeSizeInfo(type);
  const nBlocks = Math.ceil(totalElements / blockSize);
  return nBlocks * bytesPerBlock;
}

export interface ParsedGGUFFile {
  header: GGUFHeader;
  tensorDataOffset: number;
  totalFileSize: number;
  tensorsData: Map<string, Uint8Array>;
}

// ✅ ATTENTION: Parses raw binary buffer conforming to the GGUF v2/v3 specification
export function parseGGUF(buffer: Uint8Array | ArrayBuffer): ParsedGGUFFile {
  const reader = new BinaryReader(buffer, true);

  // 1. Magic & Version Check
  const magic = reader.readUint32();
  if (magic !== GGUF_MAGIC) {
    throw new Error(
      `Invalid GGUF magic header: 0x${magic.toString(16)}. Expected 0x${GGUF_MAGIC.toString(16)} ("GGUF")`
    );
  }

  const version = reader.readUint32();
  if (version < 2 || version > GGUF_VERSION_V3) {
    throw new Error(`Unsupported GGUF version: ${version}. Expected v2 or v3.`);
  }

  const tensorCount = Number(reader.readUint64());
  const metadataKVCount = Number(reader.readUint64());

  // 2. Read Key-Value Metadata
  const metadata: Record<string, { type: GGUFMetadataValueType; value: GGUFMetadataValue }> = {};
  for (let i = 0; i < metadataKVCount; i++) {
    const key = reader.readGGUFString();
    const valueType = reader.readUint32() as GGUFMetadataValueType;
    const value = readMetadataValue(reader, valueType);
    metadata[key] = { type: valueType, value };
  }

  // Check custom alignment in metadata if present
  const alignment =
    metadata["general.alignment"] !== undefined
      ? Number(metadata["general.alignment"].value)
      : GGUF_DEFAULT_ALIGNMENT;

  // 3. Read Tensor Information Table
  const tensors: TensorInfo[] = [];
  for (let i = 0; i < tensorCount; i++) {
    const name = reader.readGGUFString();
    const nDimensions = reader.readUint32();
    const dimensions: number[] = [];
    for (let d = 0; d < nDimensions; d++) {
      dimensions.push(Number(reader.readUint64()));
    }
    const type = reader.readUint32() as GGUFType;
    const offset = Number(reader.readUint64());
    const sizeBytes = calculateTensorByteSize(dimensions, type);

    tensors.push({
      name,
      nDimensions,
      dimensions,
      type,
      offset,
      sizeBytes,
    });
  }

  // 🔒 COMPILE-TIME: Header ends and tensor data begins at aligned memory boundary
  const preAlignOffset = reader.cursor;
  const tensorDataOffset = reader.align(alignment);

  // 4. Extract individual tensor slices
  const fullBytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const tensorsData = new Map<string, Uint8Array>();

  for (let i = 0; i < tensors.length; i++) {
    const tensor = tensors[i];
    const start = tensorDataOffset + tensor.offset;
    if (start < fullBytes.byteLength) {
      // Determine next tensor boundary or end of file
      const nextStart =
        i + 1 < tensors.length
          ? tensorDataOffset + tensors[i + 1].offset
          : fullBytes.byteLength;
      const end = Math.min(start + tensor.sizeBytes, nextStart, fullBytes.byteLength);
      tensorsData.set(tensor.name, fullBytes.subarray(start, end));
    }
  }

  const header: GGUFHeader = {
    magic,
    version,
    tensorCount,
    metadataKVCount,
    metadata,
    tensors,
    alignment,
  };

  return {
    header,
    tensorDataOffset,
    totalFileSize: fullBytes.byteLength,
    tensorsData,
  };
}

function readMetadataValue(reader: BinaryReader, type: GGUFMetadataValueType): GGUFMetadataValue {
  switch (type) {
    case GGUFMetadataValueType.UINT8:
      return reader.readUint8();
    case GGUFMetadataValueType.INT8:
      return reader.readInt8();
    case GGUFMetadataValueType.UINT16:
      return reader.readUint16();
    case GGUFMetadataValueType.INT16:
      return reader.readInt16();
    case GGUFMetadataValueType.UINT32:
      return reader.readUint32();
    case GGUFMetadataValueType.INT32:
      return reader.readInt32();
    case GGUFMetadataValueType.FLOAT32:
      return reader.readFloat32();
    case GGUFMetadataValueType.FLOAT64:
      return reader.readFloat64();
    case GGUFMetadataValueType.BOOL:
      return reader.readBool();
    case GGUFMetadataValueType.STRING:
      return reader.readGGUFString();
    case GGUFMetadataValueType.UINT64:
      return reader.readUint64();
    case GGUFMetadataValueType.INT64:
      return reader.readInt64();
    case GGUFMetadataValueType.ARRAY: {
      const itemType = reader.readUint32() as GGUFMetadataValueType;
      const arrayLength = Number(reader.readUint64());
      const items: GGUFMetadataValue[] = [];
      for (let i = 0; i < arrayLength; i++) {
        items.push(readMetadataValue(reader, itemType));
      }
      return items;
    }
    default:
      throw new Error(`Unknown GGUF metadata value type: ${type}`);
  }
}

// ✅ ATTENTION: Serializes metadata and tensors into a valid GGUF v3 binary container
export function serializeGGUF(params: {
  metadata: Record<string, { type: GGUFMetadataValueType; value: GGUFMetadataValue }>;
  tensors: Array<{
    name: string;
    dimensions: number[];
    type: GGUFType;
    data: Uint8Array;
  }>;
  alignment?: number;
}): Uint8Array {
  const alignment = params.alignment ?? GGUF_DEFAULT_ALIGNMENT;
  const writer = new BinaryWriter(true);

  // 1. Write Magic and Header
  writer.writeUint32(GGUF_MAGIC);
  writer.writeUint32(GGUF_VERSION_V3);
  writer.writeUint64(BigInt(params.tensors.length));

  // If alignment is non-default, include it in metadata
  const metadataEntries = Object.entries(params.metadata);
  writer.writeUint64(BigInt(metadataEntries.length));

  // 2. Write Metadata Key-Values
  for (const [key, entry] of metadataEntries) {
    writer.writeGGUFString(key);
    writer.writeUint32(entry.type);
    writeMetadataValue(writer, entry.type, entry.value);
  }

  // 3. Precompute Tensor Offsets
  let currentOffset = 0;
  const tensorDescriptors: Array<{
    name: string;
    dimensions: number[];
    type: GGUFType;
    offset: number;
    data: Uint8Array;
  }> = [];

  for (const t of params.tensors) {
    tensorDescriptors.push({
      name: t.name,
      dimensions: t.dimensions,
      type: t.type,
      offset: currentOffset,
      data: t.data,
    });
    currentOffset += t.data.byteLength;
    // Align each tensor payload to alignment boundary
    const remainder = currentOffset % alignment;
    if (remainder !== 0) {
      currentOffset += alignment - remainder;
    }
  }

  // Write Tensor Info Table
  for (const t of tensorDescriptors) {
    writer.writeGGUFString(t.name);
    writer.writeUint32(t.dimensions.length);
    for (const dim of t.dimensions) {
      writer.writeUint64(BigInt(dim));
    }
    writer.writeUint32(t.type);
    writer.writeUint64(BigInt(t.offset));
  }

  // 4. Pad header to alignment boundary
  writer.padToAlignment(alignment);

  // 5. Append Tensor Payloads
  for (const t of tensorDescriptors) {
    writer.writeBytes(t.data);
    writer.padToAlignment(alignment);
  }

  return writer.toUint8Array();
}

function writeMetadataValue(
  writer: BinaryWriter,
  type: GGUFMetadataValueType,
  value: GGUFMetadataValue
): void {
  switch (type) {
    case GGUFMetadataValueType.UINT8:
      writer.writeUint8(Number(value));
      break;
    case GGUFMetadataValueType.INT8:
      writer.writeInt8(Number(value));
      break;
    case GGUFMetadataValueType.UINT16:
      writer.writeUint16(Number(value));
      break;
    case GGUFMetadataValueType.INT16:
      writer.writeInt16(Number(value));
      break;
    case GGUFMetadataValueType.UINT32:
      writer.writeUint32(Number(value));
      break;
    case GGUFMetadataValueType.INT32:
      writer.writeInt32(Number(value));
      break;
    case GGUFMetadataValueType.FLOAT32:
      writer.writeFloat32(Number(value));
      break;
    case GGUFMetadataValueType.FLOAT64:
      writer.writeFloat64(Number(value));
      break;
    case GGUFMetadataValueType.BOOL:
      writer.writeBool(Boolean(value));
      break;
    case GGUFMetadataValueType.STRING:
      writer.writeGGUFString(String(value));
      break;
    case GGUFMetadataValueType.UINT64:
      writer.writeUint64(typeof value === "bigint" ? value : BigInt(value as number));
      break;
    case GGUFMetadataValueType.INT64:
      writer.writeInt64(typeof value === "bigint" ? value : BigInt(value as number));
      break;
    case GGUFMetadataValueType.ARRAY: {
      const arr = value as GGUFMetadataValue[];
      if (arr.length === 0) {
        writer.writeUint32(GGUFMetadataValueType.STRING);
        writer.writeUint64(0n);
        break;
      }
      // Infer item type from first element
      const first = arr[0];
      const itemType =
        typeof first === "string"
          ? GGUFMetadataValueType.STRING
          : typeof first === "boolean"
          ? GGUFMetadataValueType.BOOL
          : typeof first === "bigint"
          ? GGUFMetadataValueType.UINT64
          : Number.isInteger(first)
          ? GGUFMetadataValueType.UINT32
          : GGUFMetadataValueType.FLOAT32;

      writer.writeUint32(itemType);
      writer.writeUint64(BigInt(arr.length));
      for (const item of arr) {
        writeMetadataValue(writer, itemType, item);
      }
      break;
    }
    default:
      throw new Error(`Unsupported GGUF metadata type write: ${type}`);
  }
}
