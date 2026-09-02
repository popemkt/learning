#!/usr/bin/env python3
"""
Live Demonstration: PyTorch Pickle Security & Exploit Disassembly in Python
Uses ONLY Python Standard Library (pickle, pickletools, io, pathlib).
"""

import io
import pickle
import pickletools
from pathlib import Path

# ✅ Create a clean state dict pickle
def create_clean_pickle() -> bytes:
    clean_dict = {
        "model.layer.0.weight": [0.1, 0.2, 0.3, 0.4],
        "epoch": 1,
        "loss": 0.42
    }
    return pickle.dumps(clean_dict, protocol=2)

# ⚠️ CRITICAL: Exploit payload generator simulating an in-the-wild malicious .pt checkpoint
class MaliciousExploitPayload:
    def __reduce__(self):
        # When unpickled via pickle.load() or torch.load(), this callable executes!
        import os
        return (os.system, ('echo "[ALERT: Arbitrary Code Executed via Pickle Injection!]"',))

def create_malicious_pickle() -> bytes:
    return pickle.dumps(MaliciousExploitPayload(), protocol=2)

# ✅ Inspect bytecode opcodes safely with pickletools without executing arbitrary code
def analyze_pickle_bytecode(data: bytes, title: str):
    print(f"\n--- [ Bytecode Disassembly: {title} ] " + "-" * 30)
    out = io.StringIO()
    pickletools.dis(data, out=out)
    disassembly = out.getvalue()
    
    # Check for dangerous global imports
    has_dangerous_import = False
    for line in disassembly.splitlines():
        if "GLOBAL" in line and ("posix" in line or "os" in line or "subprocess" in line):
            print(f"  🚨 SECURITY ALERT: {line.strip()}")
            has_dangerous_import = True
        else:
            print(f"     {line}")
            
    if has_dangerous_import:
        print("\n  ❌ VERDICT: Malicious payload detected. DO NOT invoke pickle.load() or torch.load()!")
    else:
        print("\n  ✅ VERDICT: Standard dictionary serialization.")

if __name__ == "__main__":
    print("=" * 78)
    print("  LIVE PYTHON EXPERIMENT: PYTORCH PICKLE SECURITY & OPCODE DISASSEMBLY")
    print("=" * 78)
    
    clean_bytes = create_clean_pickle()
    analyze_pickle_bytecode(clean_bytes, "Clean Model State Dict")
    
    malicious_bytes = create_malicious_pickle()
    analyze_pickle_bytecode(malicious_bytes, "Crafted Malicious Checkpoint (.pt)")
    
    print("\n[✓] Pickle security analysis completed.")
