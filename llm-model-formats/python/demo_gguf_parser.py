#!/usr/bin/env python3
"""
Live Demonstration: GGUF v3 Binary Container Generation & Inspection in Python
Uses ONLY Python Standard Library (struct, pathlib).
"""

import struct
from pathlib import Path

GGUF_MAGIC = 0x46554747  # "GGUF" in little-endian uint32
GGUF_VERSION = 3
GGUF_DEFAULT_ALIGNMENT = 32

# GGUF Metadata Value Types
GGUF_TYPE_UINT32 = 4
GGUF_TYPE_STRING = 8
GGUF_TYPE_ARRAY = 9

# ✅ Helper to encode length-prefixed GGUF string
def encode_gguf_str(s: str) -> bytes:
    encoded = s.encode('utf-8')
    return struct.pack("<Q", len(encoded)) + encoded

# ✅ ATTENTION: Create a real GGUF v3 binary file on disk
def create_sample_gguf(filepath: Path) -> int:
    with open(filepath, "wb") as f:
        # 1. Header: Magic, Version, Tensor Count (2), Metadata KV Count (4)
        f.write(struct.pack("<IIQQ", GGUF_MAGIC, GGUF_VERSION, 2, 4))
        
        # 2. Metadata Key-Value 1: general.architecture = "llama"
        f.write(encode_gguf_str("general.architecture"))
        f.write(struct.pack("<I", GGUF_TYPE_STRING))
        f.write(encode_gguf_str("llama"))
        
        # Metadata Key-Value 2: llama.context_length = 8192
        f.write(encode_gguf_str("llama.context_length"))
        f.write(struct.pack("<I", GGUF_TYPE_UINT32))
        f.write(struct.pack("<I", 8192))
        
        # Metadata Key-Value 3: llama.attention.head_count_kv = 8 (GQA)
        f.write(encode_gguf_str("llama.attention.head_count_kv"))
        f.write(struct.pack("<I", GGUF_TYPE_UINT32))
        f.write(struct.pack("<I", 8))
        
        # Metadata Key-Value 4: tokenizer.ggml.tokens = ["<bos>", "<eos>", "hello", "world"]
        tokens = ["<bos>", "<eos>", "hello", "world"]
        f.write(encode_gguf_str("tokenizer.ggml.tokens"))
        f.write(struct.pack("<I", GGUF_TYPE_ARRAY))
        f.write(struct.pack("<IQ", GGUF_TYPE_STRING, len(tokens)))
        for t in tokens:
            f.write(encode_gguf_str(t))
            
        # 3. Tensor Info Table (2 tensors)
        # Tensor 0: blk.0.attn_q.weight (shape: [32, 1], dtype: 12 = Q4_K, offset: 0)
        f.write(encode_gguf_str("blk.0.attn_q.weight"))
        f.write(struct.pack("<I", 2))  # 2 dimensions
        f.write(struct.pack("<QQ", 32, 1))  # [32, 1]
        f.write(struct.pack("<I", 12))  # Q4_K type
        f.write(struct.pack("<Q", 0))   # offset 0
        
        # Tensor 1: blk.0.attn_v.weight (shape: [32, 1], dtype: 8 = Q8_0, offset: 32)
        f.write(encode_gguf_str("blk.0.attn_v.weight"))
        f.write(struct.pack("<I", 2))
        f.write(struct.pack("<QQ", 32, 1))
        f.write(struct.pack("<I", 8))   # Q8_0 type
        f.write(struct.pack("<Q", 32))  # offset 32 (aligned)
        
        # 4. Alignment padding to 32-byte boundary
        current_pos = f.tell()
        remainder = current_pos % GGUF_DEFAULT_ALIGNMENT
        if remainder != 0:
            pad_len = GGUF_DEFAULT_ALIGNMENT - remainder
            f.write(b'\x00' * pad_len)
            
        # 5. Raw Tensor Data Payloads
        # 32 bytes for tensor 0 + 32 bytes for tensor 1
        tensor0_bytes = b'\x42' * 32
        tensor1_bytes = b'\x84' * 32
        f.write(tensor0_bytes)
        f.write(tensor1_bytes)
        
    return filepath.stat().st_size

# ✅ ATTENTION: Inspect GGUF binary file directly
def inspect_gguf_file(filepath: Path):
    with open(filepath, "rb") as f:
        magic, version, tensor_count, kv_count = struct.unpack("<IIQQ", f.read(24))
        
        print(f"  [+] GGUF Magic Header : 0x{magic:08x} ({'Valid GGUF' if magic == GGUF_MAGIC else 'INVALID'})")
        print(f"  [+] GGUF Version      : v{version}")
        print(f"  [+] Tensor Count      : {tensor_count}")
        print(f"  [+] Metadata KV Count : {kv_count}")
        
        print("\n  [+] Decoded Metadata Store:")
        for _ in range(kv_count):
            k_len = struct.unpack("<Q", f.read(8))[0]
            key = f.read(k_len).decode('utf-8')
            v_type = struct.unpack("<I", f.read(4))[0]
            
            if v_type == GGUF_TYPE_STRING:
                val_len = struct.unpack("<Q", f.read(8))[0]
                val = f.read(val_len).decode('utf-8')
                print(f"      • {key:<30} = \"{val}\" (string)")
            elif v_type == GGUF_TYPE_UINT32:
                val = struct.unpack("<I", f.read(4))[0]
                print(f"      • {key:<30} = {val} (uint32)")
            elif v_type == GGUF_TYPE_ARRAY:
                item_type, arr_len = struct.unpack("<IQ", f.read(12))
                items = []
                for _ in range(arr_len):
                    s_len = struct.unpack("<Q", f.read(8))[0]
                    items.append(f.read(s_len).decode('utf-8'))
                print(f"      • {key:<30} = {items} (array of {arr_len} strings)")

if __name__ == "__main__":
    out_path = Path("sample_model.gguf")
    print("=" * 78)
    print("  LIVE PYTHON EXPERIMENT: GGUF v3 BINARY CONTAINER PARSING")
    print("=" * 78)
    
    print("\n1. Synthesizing real binary 'sample_model.gguf' on disk...")
    size = create_sample_gguf(out_path)
    print(f"   Done. Wrote {size} bytes to {out_path.absolute()}")
    
    print("\n2. Dissecting GGUF binary container...")
    inspect_gguf_file(out_path)
    
    # Cleanup
    if out_path.exists():
        out_path.unlink()
    print("\n[✓] GGUF binary inspection experiment completed successfully.")
