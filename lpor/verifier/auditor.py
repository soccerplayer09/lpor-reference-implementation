"""Auditor Verification Layer — cryptographic binding check.

The auditor layer is open: any independent party can recompute and verify
the published commitments. The process is:

1. Stream the PLL CSV file
2. Compute leaf hash for each record: L_i = SHA-256(uuid_i || token_i || value_i)
3. Rebuild the Merkle tree from all leaf hashes
4. Compare the computed root against the published Merkle root

This verification is deterministic and publicly reproducible.
"""

from decimal import Decimal
from pathlib import Path

from pydantic import BaseModel, Field

from lpor.core.ledger import PLLReader
from lpor.core.merkle import MerkleTree, hash_pll_record


class AuditorVerificationResult(BaseModel):
    """Result of an auditor's cryptographic verification."""

    proof_id: str = Field(description="Proof epoch verified")
    published_root: str = Field(description="Published Merkle root (hex)")
    computed_root: str = Field(description="Recomputed Merkle root (hex)")
    roots_match: bool = Field(description="Whether roots match")
    record_count: int = Field(description="Number of PLL records processed")
    total_sum: Decimal = Field(description="Recomputed total sum of liabilities")
    verification_passed: bool = Field(
        description="Overall verification: root match AND sum is non-negative"
    )


def verify_auditor(
    pll_path: Path,
    published_root: str,
    proof_id: str,
) -> AuditorVerificationResult:
    """Perform auditor-layer verification: recompute Merkle root from PLL.

    This is the cryptographic binding check that auditors perform:
    1. Stream the PLL file
    2. Compute leaf hashes for all records
    3. Build Merkle tree
    4. Compare computed root to published root

    Args:
        pll_path: Path to the PLL CSV file.
        published_root: The published Merkle root to verify against (hex string).
        proof_id: The proof epoch identifier.

    Returns:
        AuditorVerificationResult with match status and details.
    """
    reader = PLLReader(pll_path)

    # Stream PLL and compute leaf hashes + total sum
    leaf_hashes: list[bytes] = []
    total_sum = Decimal("0")
    record_count = 0

    for record in reader:
        leaf_hashes.append(hash_pll_record(record))
        total_sum += record.value
        record_count += 1

    # Build Merkle tree from leaf hashes
    tree = MerkleTree()
    computed_root = tree.build_from_hashes(leaf_hashes)

    # Compare roots
    roots_match = computed_root == published_root

    return AuditorVerificationResult(
        proof_id=proof_id,
        published_root=published_root,
        computed_root=computed_root,
        roots_match=roots_match,
        record_count=record_count,
        total_sum=total_sum,
        verification_passed=roots_match and total_sum >= 0,
    )
