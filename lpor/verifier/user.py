"""User Verification Layer — lightweight, no-crypto checks.

The user verification layer enables non-technical users to:
1. Verify that their tokens are included in the PLL (inclusion check)
2. Verify the total sum of all liabilities (summation check)

No cryptographic operations are required from the user.
The user only needs: their user_id, their expected balance, and the proof_id.
"""

from decimal import Decimal
from pathlib import Path

from pydantic import BaseModel, Field

from lpor.core.ledger import PLLReader
from lpor.core.tokenizer import get_user_uuids
from lpor.models.schemas import PLLRecord


class UserVerificationResult(BaseModel):
    """Result of a user's verification check."""

    user_id: str = Field(description="User who performed verification")
    proof_id: str = Field(description="Proof epoch verified against")
    expected_balance: Decimal = Field(description="User's expected balance")
    tokens_expected: int = Field(description="Number of tokens expected")
    tokens_found: int = Field(description="Number of tokens found in PLL")
    all_included: bool = Field(description="Whether all tokens were found")
    found_records: list[PLLRecord] = Field(description="Matching PLL records")
    missing_uuids: list[str] = Field(description="UUIDs not found in PLL")
    total_liabilities: Decimal | None = Field(
        default=None, description="Total sum of all PLL records (optional)"
    )


def verify_user_inclusion(
    pll_path: Path,
    user_id: str,
    balance: Decimal,
    proof_id: str,
    compute_total: bool = True,
) -> UserVerificationResult:
    """Perform user-layer verification: check token inclusion in PLL.

    This is the lightweight verification that any user can perform:
    1. Derive expected UUIDs from user_id + balance + proof_id
    2. Scan PLL to confirm all UUIDs are present
    3. Optionally compute total liabilities

    Args:
        pll_path: Path to the PLL CSV file.
        user_id: The user's identifier.
        balance: The user's expected balance.
        proof_id: The proof epoch identifier (e.g. "2026-01-15").
        compute_total: Whether to also compute total sum (additional full scan).

    Returns:
        UserVerificationResult with inclusion status and details.
    """
    # Step 1: Derive expected UUIDs
    expected_uuids = get_user_uuids(user_id, balance, proof_id)

    # Step 2: Search PLL for those UUIDs
    reader = PLLReader(pll_path)
    found_records = reader.find_uuids(set(expected_uuids))
    found_uuid_set = {r.uuid for r in found_records}

    # Determine which UUIDs are missing
    missing = [u for u in expected_uuids if u not in found_uuid_set]

    # Step 3: Optionally compute total liabilities
    total = reader.compute_total() if compute_total else None

    return UserVerificationResult(
        user_id=user_id,
        proof_id=proof_id,
        expected_balance=balance,
        tokens_expected=len(expected_uuids),
        tokens_found=len(found_records),
        all_included=len(missing) == 0,
        found_records=found_records,
        missing_uuids=missing,
        total_liabilities=total,
    )
