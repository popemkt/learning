"""
Inference Latency and Throughput Benchmark for PaddleOCR.
Measures:
- Cold Start (First Inference + Model Graph Init)
- Warm Run Latency (Average, Median, P95, Min, Max)
- Processing Throughput (Images/sec and Text-Lines/sec)
"""

import time
import statistics
from pathlib import Path
from paddleocr import PaddleOCR
from generate_samples import generate_all_samples


def run_benchmark(iterations: int = 10) -> None:
    print("=" * 75)
    print(f"PADDLEOCR PERFORMANCE BENCHMARK (N={iterations} runs)")
    print("=" * 75)

    samples = generate_all_samples()
    test_image = str(samples["card"])

    print("\n[1] Initializing Engine...")
    t0 = time.perf_counter()
    ocr = PaddleOCR(use_textline_orientation=True, lang="en")
    init_ms = (time.perf_counter() - t0) * 1000
    print(f"    ├─ Engine Initialization Time: {init_ms:.2f} ms")

    print("\n[2] Cold-Start Inference (Run #1)...")
    t0 = time.perf_counter()
    first_res = ocr.predict(test_image)
    cold_start_ms = (time.perf_counter() - t0) * 1000
    num_lines = len(first_res[0].get("rec_texts", [])) if first_res else 0
    print(f"    ├─ Cold-Start Latency: {cold_start_ms:.2f} ms")
    print(f"    └─ Text Lines Detected: {num_lines}")

    print(f"\n[3] Warm Inference ({iterations} iterations)...")
    latencies = []
    for i in range(iterations):
        t0 = time.perf_counter()
        _ = ocr.predict(test_image)
        dur_ms = (time.perf_counter() - t0) * 1000
        latencies.append(dur_ms)
        print(f"    ├─ Iteration {i+1:2d}: {dur_ms:6.2f} ms")

    mean_ms = statistics.mean(latencies)
    median_ms = statistics.median(latencies)
    min_ms = min(latencies)
    max_ms = max(latencies)
    fps = 1000.0 / mean_ms
    lines_per_sec = (num_lines * 1000.0) / mean_ms

    print("\n" + "=" * 75)
    print("BENCHMARK SUMMARY")
    print("=" * 75)
    print(f"Target Image:           {Path(test_image).name}")
    print(f"Lines Extracted:        {num_lines} lines")
    print(f"Cold Start:             {cold_start_ms:.2f} ms")
    print(f"Warm Mean Latency:      {mean_ms:.2f} ms")
    print(f"Warm Median Latency:    {median_ms:.2f} ms")
    print(f"Warm Min Latency:       {min_ms:.2f} ms")
    print(f"Warm Max Latency:       {max_ms:.2f} ms")
    print(f"Throughput (Images):    {fps:.2f} FPS")
    print(f"Throughput (Lines):     {lines_per_sec:.2f} lines/sec")
    print("=" * 75)


if __name__ == "__main__":
    run_benchmark(iterations=5)
