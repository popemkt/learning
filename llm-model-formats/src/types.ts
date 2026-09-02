// ============================================================================
// DOMAIN TYPES: LLM MODEL FORMATS, QUANTIZATION & RUNTIME TAXONOMY
// ============================================================================

// ✅ ATTENTION: GGUF v3 Magic constant "GGUF" in little-endian ASCII (0x46554747)
export const GGUF_MAGIC = 0x46554747;
export const GGUF_VERSION_V3 = 3;
export const GGUF_DEFAULT_ALIGNMENT = 32;

// 🔒 COMPILE-TIME: Format categorization representing different stages in model lifecycle
export enum FormatCategory {
  TRAINING_CHECKPOINT = "TRAINING_CHECKPOINT", // e.g. PyTorch .pt/.bin (raw pickle)
  WEIGHT_CONTAINER = "WEIGHT_CONTAINER",       // e.g. SafeTensors (zero-copy memory mapped)
  UNIFIED_EDGE_QUANT = "UNIFIED_EDGE_QUANT",   // e.g. GGUF (metadata + tokenizer + k-quants)
  MLX_UNIFIED_CONTAINER = "MLX_UNIFIED_CONTAINER", // e.g. Apple MLX (Metal native arrays in SafeTensors)
  NATIVE_FP8_CONTAINER = "NATIVE_FP8_CONTAINER", // e.g. DeepSeek-V3 / NVIDIA FP8 (E4M3 / E5M2)
  TERNARY_BITNET = "TERNARY_BITNET",           // e.g. BitNet 1.58-bit {-1, 0, +1}
  LEGACY_QUANT = "LEGACY_QUANT",               // e.g. GGML / GGJT (deprecated formats)
  GPU_PACKED_QUANT = "GPU_PACKED_QUANT",       // e.g. AWQ, GPTQ, EXL2 (in SafeTensors container)
  COMPILED_ENGINE = "COMPILED_ENGINE",         // e.g. TensorRT engine, ONNX graph
}

// ⚠️ CRITICAL: Security risk levels across model serialization technologies
export enum SecurityRisk {
  // Safe: Zero arbitrary code execution risk, purely declarative headers + data
  SAFE = "SAFE",
  // High Risk: Pickled python object graph allows arbitrary shell/process execution on load
  ARBITRARY_CODE_EXECUTION = "ARBITRARY_CODE_EXECUTION",
  // Hardware/Kernel binary blob: Requires full trust in supplier
  COMPILED_EXECUTABLE_BLOB = "COMPILED_EXECUTABLE_BLOB",
}

// GGUF tensor type enumeration matching llama.cpp ggml_type definition
export enum GGUFType {
  F32 = 0,
  F16 = 1,
  Q4_0 = 2,
  Q4_1 = 3,
  Q5_0 = 6,
  Q5_1 = 7,
  Q8_0 = 8,
  Q8_1 = 9,
  Q2_K = 10,
  Q3_K = 11,
  Q4_K = 12,
  Q5_K = 13,
  Q6_K = 14,
  Q8_K = 15,
  IQ2_XXS = 16,
  IQ2_XS = 17,
  IQ3_XXS = 18,
  IQ1_S = 19,
  IQ4_NL = 20,
  IQ3_S = 21,
  IQ2_S = 22,
  IQ4_XS = 23,
  I8 = 24,
  I16 = 25,
  I32 = 26,
  I64 = 27,
  F64 = 28,
  IQ1_M = 29,
  BF16 = 30,
}

// GGUF key-value metadata value types
export enum GGUFMetadataValueType {
  UINT8 = 0,
  INT8 = 1,
  UINT16 = 2,
  INT16 = 3,
  UINT32 = 4,
  INT32 = 5,
  FLOAT32 = 6,
  BOOL = 7,
  STRING = 8,
  ARRAY = 9,
  UINT64 = 10,
  INT64 = 11,
  FLOAT64 = 12,
}

// SafeTensors data types according to the Hugging Face SafeTensors specification
export type SafeTensorsDType =
  | "F64"
  | "F32"
  | "F16"
  | "BF16"
  | "F8_E4M3"
  | "F8_E5M2"
  | "I64"
  | "I32"
  | "I16"
  | "I8"
  | "U8"
  | "BOOL";
export interface TensorInfo {
  name: string;
  nDimensions: number;
  dimensions: number[];
  type: GGUFType | SafeTensorsDType;
  offset: number; // Offset relative to tensor data start
  sizeBytes: number;
}

// SafeTensors JSON header format
export interface SafeTensorsHeader {
  __metadata__?: Record<string, string>;
  [tensorName: string]:
    | {
        dtype: SafeTensorsDType;
        shape: number[];
        data_offsets: [number, number]; // [startOffset, endOffset] relative to data block
      }
    | Record<string, string>
    | undefined;
}

// Key-value metadata value representation
export type GGUFMetadataValue =
  | number
  | bigint
  | boolean
  | string
  | GGUFMetadataValue[];

export interface GGUFHeader {
  magic: number;
  version: number;
  tensorCount: bigint | number;
  metadataKVCount: bigint | number;
  metadata: Record<string, { type: GGUFMetadataValueType; value: GGUFMetadataValue }>;
  tensors: TensorInfo[];
  alignment: number;
}

// Quantization scheme breakdown and characteristics
export interface QuantizationSchemeInfo {
  name: string;
  bitsPerWeight: number;
  blockSize: number;
  description: string;
  targetHardware: string;
  recommendedUse: string;
  relativeQualityVsFP16: number; // 0.0 to 1.0 (e.g. 0.985 for Q4_K_M)
  memoryReductionMultiplier: number; // e.g. ~3.5x for 4-bit vs FP16
}

// Format profile for comparison matrix
export interface ModelFormatProfile {
  id: string;
  displayName: string;
  fileExtensions: string[];
  category: FormatCategory;
  securityRisk: SecurityRisk;
  supportsMmap: boolean;
  isSingleFileSelfContained: boolean;
  containsTokenizer: boolean;
  containsArchitectureHyperparams: boolean;
  primaryEcosystem: string;
  bestFor: string;
  worstFor: string;
  typicalDTypes: string[];
}

// Memory and hardware computation specifications
export interface ModelSpec {
  parameterCountBillions: number; // e.g. 7, 8, 70
  contextWindowTokens: number;     // e.g. 8192, 32768, 131072
  vocabSize: number;              // e.g. 32000, 128256
  hiddenDim: number;              // e.g. 4096
  numLayers: number;              // e.g. 32
  numAttentionHeads: number;      // e.g. 32
  numKeyValueHeads: number;       // e.g. 8 (for Grouped-Query Attention)
}

export interface VRAMCalculationResult {
  weightsMemoryBytes: number;
  weightsMemoryGB: number;
  kvCacheMemoryPerTokenBytes: number;
  kvCacheTotalGB: number;
  activationOverheadGB: number;
  cudaContextOverheadGB: number;
  totalVRAMRequiredGB: number;
  canFitInVRAM: boolean;
  offloadLayersRecommended?: number;
}
