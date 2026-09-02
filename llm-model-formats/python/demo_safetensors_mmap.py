#!/usr/bin/env python3
"""
Live Demonstration: SafeTensors Binary Packing & Zero-Copy Memory Mapping in Python
Uses ONLY Python Standard Library (struct, json, mmap, os, pathlib).
"""

import os
import json
import mmap
import struct
from pathlib import Path

# ✅ ATTENTION: Create a real SafeTensors binary file on disk
def create_sample_safetensors(filepath: Path) -> int:
    # 1. Prepare sample tensors (FP32 floats)
    tensor_q = struct.pack("<4f", 0.1, 0.2, -0.3, 0.4)       # 4 floats = 16 bytes
    tensor_k = struct.pack("<4f", 1.0, -1.0, 2.0, -2.0)     # 4 floats = 16 bytes
    
    # 2. Build JSON header
    header = {
        "__metadata__": {"format": "pt", "author": "learning-workspace"},
        "model.layers.0.self_attn.q_proj.weight": {
            "dtype": "F32",
            "shape": [2, 2],
            "data_offsets": [0, len(tensor_q)]
        },
        "model.layers.0.self_attn.k_proj.weight": {
            "dtype": "F32",
            "shape": [2, 2],
            "data_offsets": [len(tensor_q), len(tensor_q) + len(tensor_k)]
        }
    }
    
    header_json_bytes = json.dumps(header, separators=(',', ':')).encode('utf-8')
    header_size = len(header_json_bytes)
    
    # 3. Write binary file: [8-byte uint64 header_size] + [header JSON] + [raw tensor data]
    with open(filepath, "wb") as f:
        f.write(struct.pack("<Q", header_size))
        f.write(header_json_bytes)
        f.write(tensor_q)
        f.write(tensor_k)
        
    return filepath.stat().st_size

# ✅ ATTENTION: Zero-copy mmap parser
def read_safetensors_with_mmap(filepath: Path):
    file_size = filepath.stat().st_size
    
    with open(filepath, "rb") as f:
        # 1. Memory-map the file directly from disk into address space
        # 🔒 COMPILE-TIME: No memory copy occurs here. The OS page table maps the file directly.
        mm = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        
        # 2. Read 8-byte header size
        header_size = struct.unpack("<Q", mm[0:8])[0]
        
        # 3. Decode JSON metadata
        header_json = mm[8 : 8 + header_size].decode('utf-8')
        metadata = json.loads(header_json)
        
        data_block_start = 8 + header_size
        print(f"  [+] File Size: {file_size} bytes")
        print(f"  [+] Header Size: {header_size} bytes")
        print(f"  [+] Raw Tensor Data begins at byte offset: 0x{data_block_start:04x}")
        
        # 4. Zero-copy slice tensors directly from the memory map
        for tensor_name, info in metadata.items():
            if tensor_name == "__metadata__":
                print(f"  [+] Embedded Metadata: {info}")
                continue
            
            start_off, end_off = info["data_offsets"]
            abs_start = data_block_start + start_off
            abs_end = data_block_start + end_off
            
            # Zero-copy memoryview slice directly into underlying page table
            tensor_slice = memoryview(mm)[abs_start:abs_end]
            floats = struct.unpack(f"<{len(tensor_slice)//4}f", tensor_slice)
            
            print(f"    -> Tensor: '{tensor_name}' | Shape: {info['shape']} | DType: {info['dtype']}")
            print(f"       Byte Range: [0x{abs_start:04x} .. 0x{abs_end:04x}] ({len(tensor_slice)} bytes)")
            print(f"       Decoded Float Values: {floats}")
            tensor_slice.release()  # Release pointer reference before mmap close
            
        mm.close()
if __name__ == "__main__":
    out_path = Path("sample_model.safetensors")
    print("=" * 78)
    print("  LIVE PYTHON EXPERIMENT: SAFETENSORS ZERO-COPY MMAP DESERIALIZATION")
    print("=" * 78)
    
    print("\n1. Writing real binary 'sample_model.safetensors' to disk...")
    size = create_sample_safetensors(out_path)
    print(f"   Done. Wrote {size} bytes to {out_path.absolute()}")
    
    print("\n2. Reading back via mmap (Zero Memory Duplication)...")
    read_safetensors_with_mmap(out_path)
    
    # Cleanup
    if out_path.exists():
        out_path.unlink()
    print("\n[✓] SafeTensors mmap experiment completed successfully.")
