// ============================================================================
// SAFETENSORS (Hugging Face Zero-Copy Standard) PARSER & SERIALIZER
// ============================================================================

import {
  type SafeTensorsHeader,
  type SafeTensorsDType,
  type TensorInfo,
} from "../types.js";

export interface ParsedSafeTensorsFile {
  header: SafeTensorsHeader;
  headerSizeBytes: number;
  dataBlockOffset: number;
  totalFileSize: number;
  tensors: TensorInfo[];
  tensorsData: Map<string, Uint8Array>;
  metadata?: Record<string, string>;
}

// Map SafeTensors dtype to byte size per element
export function getSafeTensorsDTypeByteSize(dtype: SafeTensorsDType): number {
  switch (dtype) {
    case "F64":
    case "I64":
      return 8;
    case "F32":
    case "I32":
      return 4;
    case "F16":
    case "BF16":
    case "I16":
      return 2;
    case "I8":
    case "U8":
    case "BOOL":
      return 1;
    default:
      return 4;
  }
}

// ✅ ATTENTION: Parses raw binary SafeTensors buffer according to the Hugging Face specification
export function parseSafeTensors(buffer: Uint8Array | ArrayBuffer): ParsedSafeTensorsFile {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.byteLength < 8) {
    throw new Error(
      `Invalid SafeTensors file: Buffer size (${bytes.byteLength} bytes) is smaller than the minimum 8-byte header size indicator.`
    );
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // 1. Read 8-byte unsigned little-endian JSON header size N
  const headerSizeBytesBig = view.getBigUint64(0, true);
  if (headerSizeBytesBig > BigInt(100 * 1024 * 1024)) {
    // ⚠️ CRITICAL: Header size sanity check to prevent memory exhaustion attacks
    throw new Error(
      `SafeTensors header size too large (${headerSizeBytesBig} bytes). Possible malformed file.`
    );
  }
  const headerSizeBytes = Number(headerSizeBytesBig);

  if (8 + headerSizeBytes > bytes.byteLength) {
    throw new Error(
      `SafeTensors truncated file: Expected ${8 + headerSizeBytes} bytes for header, but file is only ${bytes.byteLength} bytes.`
    );
  }

  // 2. Decode UTF-8 JSON header
  const headerSlice = bytes.subarray(8, 8 + headerSizeBytes);
  const decoder = new TextDecoder("utf-8");
  const headerJsonStr = decoder.decode(headerSlice);

  let header: SafeTensorsHeader;
  try {
    header = JSON.parse(headerJsonStr) as SafeTensorsHeader;
  } catch (err) {
    throw new Error(
      `Failed to parse SafeTensors JSON header: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const dataBlockOffset = 8 + headerSizeBytes;
  const tensors: TensorInfo[] = [];
  const tensorsData = new Map<string, Uint8Array>();
  let metadata: Record<string, string> | undefined = undefined;

  // 3. Process tensor descriptors and extract slices
  for (const [key, value] of Object.entries(header)) {
    if (key === "__metadata__") {
      metadata = value as Record<string, string>;
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      "dtype" in value &&
      "shape" in value &&
      "data_offsets" in value
    ) {
      const tensorEntry = value as {
        dtype: SafeTensorsDType;
        shape: number[];
        data_offsets: [number, number];
      };

      const [startOffset, endOffset] = tensorEntry.data_offsets;
      const sizeBytes = endOffset - startOffset;

      tensors.push({
        name: key,
        nDimensions: tensorEntry.shape.length,
        dimensions: tensorEntry.shape,
        type: tensorEntry.dtype,
        offset: startOffset,
        sizeBytes,
      });

      const absoluteStart = dataBlockOffset + startOffset;
      const absoluteEnd = dataBlockOffset + endOffset;

      if (absoluteEnd <= bytes.byteLength) {
        // Zero-copy view into underlying buffer
        tensorsData.set(key, bytes.subarray(absoluteStart, absoluteEnd));
      }
    }
  }

  return {
    header,
    headerSizeBytes,
    dataBlockOffset,
    totalFileSize: bytes.byteLength,
    tensors,
    tensorsData,
    metadata,
  };
}

// ✅ ATTENTION: Serializes tensors and metadata into a valid SafeTensors binary container
export function serializeSafeTensors(params: {
  metadata?: Record<string, string>;
  tensors: Array<{
    name: string;
    dtype: SafeTensorsDType;
    shape: number[];
    data: Uint8Array;
  }>;
}): Uint8Array {
  const headerObject: SafeTensorsHeader = {};

  if (params.metadata && Object.keys(params.metadata).length > 0) {
    headerObject.__metadata__ = params.metadata;
  }

  let currentOffset = 0;
  for (const tensor of params.tensors) {
    const tensorSize = tensor.data.byteLength;
    headerObject[tensor.name] = {
      dtype: tensor.dtype,
      shape: tensor.shape,
      data_offsets: [currentOffset, currentOffset + tensorSize],
    };
    currentOffset += tensorSize;
  }

  const jsonStr = JSON.stringify(headerObject);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonStr);
  const headerSizeBytes = jsonBytes.byteLength;

  const totalFileSize = 8 + headerSizeBytes + currentOffset;
  const result = new Uint8Array(totalFileSize);
  const view = new DataView(result.buffer, result.byteOffset, result.byteLength);

  // 1. Write 8-byte uint64 header size
  view.setBigUint64(0, BigInt(headerSizeBytes), true);

  // 2. Write JSON header bytes
  result.set(jsonBytes, 8);

  // 3. Write tensor payloads
  let writeOffset = 8 + headerSizeBytes;
  for (const tensor of params.tensors) {
    result.set(tensor.data, writeOffset);
    writeOffset += tensor.data.byteLength;
  }

  return result;
}
