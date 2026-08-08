#!/usr/bin/env python3
"""Benchmark script — reproduces Table III from the LPOR paper.

Measures:
  - Proof size (PLL + Merkle tree + metadata)
  - Proof generation time (tokenize + write PLL + build Merkle tree)
  - Public recomputation time (sum verification + Merkle root recomputation)

Usage:
    python scripts/run_benchmark.py
    python scripts/run_benchmark.py --scales 10000 100000
    python scripts/run_benchmark.py --output results.json
"""

import argparse
import json
import shutil
import sys
import time
from decimal import Decimal
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from lpor.core.generator import generate_users
from lpor.core.ledger import PLLReader, PLLWriter
from lpor.core.merkle import MerkleTree
from lpor.core.tokenizer import tokenize_balance


def run_benchmark(
    n_users: int, output_base: Path, seed: int = 42
) -> dict:
    """Run a single benchmark at a given user scale.

    Returns a dict with timing and size measurements.
    """
    proof_id = f"bench-{n_users}"
    epoch_dir = output_base / proof_id
    pll_path = epoch_dir / "pll.csv"

    # Clean up any previous run
    if epoch_dir.exists():
        shutil.rmtree(epoch_dir)
    epoch_dir.mkdir(parents=True)

    # --- Phase 1: Proof Generation (tokenize + write PLL + build Merkle) ---
    t_gen_start = time.perf_counter()

    # Tokenize and write PLL
    writer = PLLWriter(pll_path, proof_id=proof_id)
    for user in generate_users(n_users, seed=seed):
        tokens = tokenize_balance(user, proof_id)
        for token in tokens:
            writer.write_token(token)
    metadata = writer.finalize()

    t_pll_done = time.perf_counter()

    # Build Merkle tree
    use_mmap = n_users > 100_000
    tree_path = epoch_dir / "merkle_tree.bin" if use_mmap else None
    tree = MerkleTree(output_path=tree_path, use_mmap=use_mmap)
    tree.build_from_pll(pll_path)
    tree.close()

    t_gen_end = time.perf_counter()

    # --- Measure proof size ---
    pll_size = pll_path.stat().st_size
    tree_size = tree_path.stat().st_size if tree_path and tree_path.exists() else 0
    # metadata.json is small, approximate
    meta_size = 500
    total_proof_size = pll_size + tree_size + meta_size

    # --- Phase 2: Public Recomputation (download sim + sum + Merkle rebuild) ---
    # Simulate download at 100 Mbps
    download_time = (pll_size * 8) / (100 * 1_000_000)  # seconds

    # Recompute: stream PLL → sum + rebuild Merkle root
    t_verify_start = time.perf_counter()

    reader = PLLReader(pll_path)
    from lpor.core.merkle import hash_pll_record

    leaf_hashes: list[bytes] = []
    verify_sum = Decimal("0")
    for record in reader:
        leaf_hashes.append(hash_pll_record(record))
        verify_sum += record.value

    verify_tree = MerkleTree()
    verify_tree.build_from_hashes(leaf_hashes)

    t_verify_end = time.perf_counter()

    recomputation_time = t_verify_end - t_verify_start
    public_verify_time = download_time + recomputation_time

    result = {
        "users": n_users,
        "pll_records": metadata.record_count,
        "total_sum": str(metadata.total_sum),
        "proof_size_bytes": total_proof_size,
        "proof_size_mb": round(total_proof_size / 1_000_000, 2),
        "proof_generation_s": round(t_gen_end - t_gen_start, 2),
        "pll_write_s": round(t_pll_done - t_gen_start, 2),
        "merkle_build_s": round(t_gen_end - t_pll_done, 2),
        "download_sim_s": round(download_time, 2),
        "recomputation_s": round(recomputation_time, 2),
        "public_verify_s": round(public_verify_time, 2),
        "bytes_per_user": round(total_proof_size / n_users, 1),
    }

    # Cleanup large files to save disk
    if tree_path and tree_path.exists():
        tree_path.unlink()
    if pll_path.exists():
        pll_path.unlink()
    if epoch_dir.exists():
        shutil.rmtree(epoch_dir, ignore_errors=True)

    return result


def format_results(results: list[dict]) -> str:
    """Format benchmark results as a markdown table."""
    lines = []
    lines.append("| Users | Proof Size | Proof Generation | Public Verify | Bytes/User |")
    lines.append("|------:|----------:|-----------------:|--------------:|-----------:|")

    for r in results:
        size = r["proof_size_mb"]
        if size >= 1000:
            size_str = f"{size / 1000:.2f} GB"
        else:
            size_str = f"{size:.2f} MB"

        lines.append(
            f"| {r['users']:>10,} | {size_str:>10} | "
            f"{r['proof_generation_s']:>10.2f}s | "
            f"{r['public_verify_s']:>10.2f}s | "
            f"{r['bytes_per_user']:>10.1f} |"
        )

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="LPOR Benchmark — reproduce Table III")
    parser.add_argument(
        "--scales",
        nargs="+",
        type=int,
        default=[10_000, 100_000, 1_000_000],
        help="User counts to benchmark (default: 10^4, 10^5, 10^6)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output file for JSON results",
    )
    parser.add_argument(
        "--seed", type=int, default=42, help="Random seed"
    )
    args = parser.parse_args()

    output_base = Path("/tmp/lpor_benchmark")
    output_base.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("LPOR Benchmark — Reproducing Table III")
    print("=" * 60)
    print(f"Scales: {[f'{s:,}' for s in args.scales]}")
    print(f"Single-threaded, seed={args.seed}")
    print()

    results = []
    for n in args.scales:
        print(f"Running N={n:,}...", end=" ", flush=True)
        t0 = time.perf_counter()
        result = run_benchmark(n, output_base, seed=args.seed)
        elapsed = time.perf_counter() - t0
        print(f"done ({elapsed:.1f}s)")
        results.append(result)

    print()
    print("Results:")
    print()
    print(format_results(results))
    print()

    # Compare with paper values
    print("Paper reference (Table III):")
    print("| 10,000 | 5.10 MB | 0.69s | 0.53s |")
    print("| 100,000 | 51.13 MB | 7.69s | 5.40s |")
    print("| 1,000,000 | 510.97 MB | 81.42s | 54.96s |")
    print("| 10,000,000 | 5.11 GB | 880.89s | 568.76s |")

    if args.output:
        Path(args.output).write_text(json.dumps(results, indent=2))
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
