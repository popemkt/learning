#!/usr/bin/env python3
"""
Master Python Experiment Runner for LLM Model Formats
Executes all Python demonstrations sequentially.
"""

import subprocess
import sys
from pathlib import Path

def run_script(script_name: str, title: str):
    script_path = Path(__file__).parent / script_name
    print("\n" + "#" * 80)
    print(f"  RUNNING: {title} ({script_name})")
    print("#" * 80 + "\n")
    
    res = subprocess.run([sys.executable, str(script_path)])
    if res.returncode != 0:
        print(f"❌ Script {script_name} failed with return code {res.returncode}")
        sys.exit(res.returncode)

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("  🚀 LLM MODEL FORMATS: MASTER PYTHON EXPERIMENT SUITE")
    print("=" * 80)
    
    run_script("demo_safetensors_mmap.py", "SafeTensors Packing & Zero-Copy mmap")
    run_script("demo_gguf_parser.py", "GGUF v3 Binary Container Serialization & Parsing")
    run_script("demo_pickle_security.py", "PyTorch Pickle Security & Exploit Opcode Disassembly")
    run_script("demo_quantization_sim.py", "Quantization Math & SNR / RMSE Metrics")
    
    print("\n" + "=" * 80)
    print("  🎉 ALL PYTHON EXPERIMENTS COMPLETED SUCCESSFULLY!")
    print("=" * 80 + "\n")
