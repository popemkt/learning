#!/usr/bin/env python3
"""
Live Demonstration: Numerical Quantization Simulation & Metrics in Python
Uses ONLY Python Standard Library (math, random, struct).
"""

import math
import random
from typing import List, Tuple

def generate_normal_weights(n: int = 512, std_dev: float = 0.03) -> List[float]:
    random.seed(42)
    return [random.gauss(0, std_dev) for _ in range(n)]

def compute_metrics(original: List[float], dequantized: List[float], name: str, bits_per_weight: float):
    n = len(original)
    sum_sq_err = sum((o - d) ** 2 for o, d in zip(original, dequantized))
    sum_sq_sig = sum(o ** 2 for o in original)
    
    mse = sum_sq_err / n
    rmse = math.sqrt(mse)
    snr_db = 10.0 * math.log10(sum_sq_sig / sum_sq_err) if sum_sq_err > 0 else 99.9
    
    fp32_bytes = n * 4
    compressed_bytes = int(n * (bits_per_weight / 8.0))
    compression_ratio = fp32_bytes / compressed_bytes
    
    print(f"  • {name:<22} | Bits/W: {bits_per_weight:>4.1f} | Ratio: {compression_ratio:>4.1f}x vs FP32 | RMSE: {rmse:.6f} | SNR: {snr_db:>5.2f} dB")

# 1. Q8_0 (32 weights per block)
def quantize_q8_0(weights: List[float]) -> List[float]:
    dequantized = []
    block_size = 32
    for b in range(0, len(weights), block_size):
        block = weights[b : b + block_size]
        amax = max(abs(x) for x in block)
        scale = amax / 127.0 if amax > 0 else 1.0
        inv_scale = 1.0 / scale
        for x in block:
            q = max(-128, min(127, round(x * inv_scale)))
            dequantized.append(q * scale)
    return dequantized

# 2. Q4_0 (32 weights per block, 4-bit nibbles)
def quantize_q4_0(weights: List[float]) -> List[float]:
    dequantized = []
    block_size = 32
    for b in range(0, len(weights), block_size):
        block = weights[b : b + block_size]
        amax = max(abs(x) for x in block)
        scale = amax / -8.0 if amax > 0 else 1.0
        inv_scale = 1.0 / scale
        for x in block:
            q = max(-8, min(7, round(x * inv_scale)))
            dequantized.append(q * scale)
    return dequantized

# 3. Apple MLX Group-wise Affine (4-bit, group=64)
def quantize_mlx_affine(weights: List[float], group_size: int = 64) -> List[float]:
    dequantized = []
    for g in range(0, len(weights), group_size):
        group = weights[g : g + group_size]
        w_min, w_max = min(group), max(group)
        scale = (w_max - w_min) / 15.0 if w_max > w_min else 1.0
        bias = w_min
        inv_scale = 1.0 / scale
        for x in group:
            q = max(0, min(15, round((x - bias) * inv_scale)))
            dequantized.append(q * scale + bias)
    return dequantized

# 4. Microsoft BitNet 1.58-bit Ternary {-1, 0, +1}
def quantize_bitnet_1_58b(weights: List[float], block_size: int = 128) -> List[float]:
    dequantized = []
    for b in range(0, len(weights), block_size):
        block = weights[b : b + block_size]
        gamma = sum(abs(x) for x in block) / len(block)
        inv_gamma = 1.0 / gamma if gamma > 0 else 1.0
        for x in block:
            q = max(-1, min(1, round(x * inv_gamma)))
            dequantized.append(q * gamma)
    return dequantized

if __name__ == "__main__":
    print("=" * 78)
    print("  LIVE PYTHON EXPERIMENT: QUANTIZATION SCHEMES & NUMERICAL ERROR ANALYSIS")
    print("=" * 78)
    
    weights = generate_normal_weights(512, 0.03)
    print(f"\nSimulating Quantization on {len(weights)} layer weights (FP32 baseline: 2,048 bytes):\n")
    
    deq_q8 = quantize_q8_0(weights)
    compute_metrics(weights, deq_q8, "Q8_0 (8-bit Block)", 8.5)
    
    deq_q4 = quantize_q4_0(weights)
    compute_metrics(weights, deq_q4, "Q4_0 (4-bit Uniform)", 4.5)
    
    deq_mlx = quantize_mlx_affine(weights, 64)
    compute_metrics(weights, deq_mlx, "Apple MLX (4-bit Affine)", 4.5)
    
    deq_bitnet = quantize_bitnet_1_58b(weights, 128)
    compute_metrics(weights, deq_bitnet, "BitNet (1.58-bit Ternary)", 1.58)
    
    print("\n[✓] Quantization numerical simulation completed.")
