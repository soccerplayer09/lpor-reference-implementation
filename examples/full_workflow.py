#!/usr/bin/env python3
"""Full LPOR workflow — end-to-end demonstration.

This script demonstrates the complete LPOR protocol:
1. Generate synthetic user balances
2. Run Balance Tokenizer (Protocol 1)
3. Write Public Liability Ledger (Protocol 2)
4. Build Merkle tree commitment
5. Perform user verification (lightweight, no crypto)
6. Perform auditor verification (Merkle root recomputation)
7. Show omission detectability analysis

Runs in under 10 seconds with 1,000 users.

Usage:
    python examples/full_workflow.py
"""

import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from lpor.core.detectability import format_table, generate_table_iv
from lpor.core.generator import dataset_stats, generate_users_list
from lpor.core.ledger import PLLWriter
from lpor.core.merkle import MerkleTree, verify_proof
from lpor.core.tokenizer import tokenize_balance
from lpor.verifier.auditor import verify_auditor
from lpor.verifier.user import verify_user_inclusion


def main() -> None:
    print("=" * 60)
    print("  LPOR — Full Workflow Demonstration")
    print("  Layered Proof of Reserves")
    print("=" * 60)
    print()

    # Configuration
    n_users = 1000
    proof_id = "2026-01-15"
    seed = 42
    output_dir = Path("/tmp/lpor_demo") / proof_id
    pll_path = output_dir / "pll.csv"

    t_start = time.perf_counter()

    # ─── Step 1: Generate synthetic user balances ───────────────────
    print("Step 1: Generate synthetic user balances")
    print(f"        N = {n_users:,} users, seed = {seed}")

    users = generate_users_list(n_users, seed=seed)
    stats = dataset_stats(users)

    print(f"        Total liabilities: {stats['total']} BTC")
    print(f"        Min balance: {stats['min']} BTC")
    print(f"        Max balance: {stats['max']} BTC")
    print(f"        Median balance: {stats['median']} BTC")
    print()

    # ─── Step 2: Balance Tokenizer (Protocol 1) ────────────────────
    print("Step 2: Balance Tokenizer (Protocol 1)")
    print("        Decomposing balances into standard denominations...")

    # Show example for one user
    example_user = users[0]
    example_tokens = tokenize_balance(example_user, proof_id)
    print(f"        Example: user '{example_user.user_id}'")
    print(f"          Balance: {example_user.balance} BTC")
    print(f"          Tokens:  {len(example_tokens)} tokens")
    for t in example_tokens[:5]:
        print(f"            {t.uuid[:12]}... | {t.token} | {t.value}")
    if len(example_tokens) > 5:
        print(f"            ... and {len(example_tokens) - 5} more")
    print()

    # ─── Step 3: Write Public Liability Ledger (Protocol 2) ────────
    print("Step 3: Write Public Liability Ledger (PLL)")
    print(f"        Output: {pll_path}")

    writer = PLLWriter(pll_path, proof_id=proof_id)
    total_tokens = 0
    for user in users:
        tokens = tokenize_balance(user, proof_id)
        for token in tokens:
            writer.write_token(token)
            total_tokens += 1
    metadata = writer.finalize()

    print(f"        Records written: {metadata.record_count:,}")
    print(f"        Total sum: {metadata.total_sum} BTC")
    print(f"        File size: {pll_path.stat().st_size / 1000:.1f} KB")
    print()

    # ─── Step 4: Build Merkle Tree ─────────────────────────────────
    print("Step 4: Build Merkle Tree (commitment)")

    tree = MerkleTree()
    merkle_root = tree.build_from_pll(pll_path)

    print(f"        Merkle root: {merkle_root[:32]}...")
    print(f"        Leaves: {tree.num_leaves:,}")

    # Generate an inclusion proof for the first leaf
    proof = tree.generate_proof(0)
    valid = verify_proof(proof)
    print(f"        Sample proof (leaf 0): {'valid ✓' if valid else 'INVALID ✗'}")
    print(f"        Proof path length: {len(proof.siblings)} nodes")
    print()

    # ─── Step 5: User Verification ─────────────────────────────────
    print("Step 5: User Verification (lightweight, no crypto needed)")
    print(f"        Verifying user: '{example_user.user_id}'")

    result = verify_user_inclusion(
        pll_path=pll_path,
        user_id=example_user.user_id,
        balance=example_user.balance,
        proof_id=proof_id,
    )

    status = "✓ INCLUDED" if result.all_included else "✗ NOT FOUND"
    print(f"        Result: {status}")
    print(f"        Tokens expected: {result.tokens_expected}")
    print(f"        Tokens found: {result.tokens_found}")
    print(f"        Total liabilities: {result.total_liabilities} BTC")
    print()

    # ─── Step 6: Auditor Verification ──────────────────────────────
    print("Step 6: Auditor Verification (Merkle root recomputation)")

    audit_result = verify_auditor(
        pll_path=pll_path,
        published_root=merkle_root,
        proof_id=proof_id,
    )

    status = "✓ PASSED" if audit_result.verification_passed else "✗ FAILED"
    print(f"        Result: {status}")
    print(f"        Published root:  {audit_result.published_root[:24]}...")
    print(f"        Computed root:   {audit_result.computed_root[:24]}...")
    print(f"        Roots match: {audit_result.roots_match}")
    print(f"        Records verified: {audit_result.record_count:,}")
    print()

    # ─── Step 7: Omission Detectability ────────────────────────────
    print("Step 7: Omission Detectability (Table IV)")
    print("        N=10M users, 0.001% omission → k=100 omitted")
    print()
    results = generate_table_iv()
    print(format_table(results))
    print()

    # ─── Summary ───────────────────────────────────────────────────
    t_end = time.perf_counter()
    print("─" * 60)
    print(f"  Complete workflow finished in {t_end - t_start:.2f}s")
    print()
    print("  Key LPOR properties demonstrated:")
    print("    • Non-negative tokenized liabilities (by construction)")
    print("    • Public summation of total liabilities")
    print("    • User verification without cryptographic operations")
    print("    • Independent auditor verification via Merkle recomputation")
    print("    • Higher participation → higher omission detection")
    print()
    print("  \"A proof that nobody verifies is not transparency.\"")
    print("─" * 60)


if __name__ == "__main__":
    main()
