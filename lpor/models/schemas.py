"""Pydantic data models for the LPOR protocol.

Defines the core data structures that flow through the system:
- UserBalance: raw exchange liability record (private)
- Token: a single tokenized balance unit
- PLLRecord: one row in the Public Liability Ledger (public)
- PLLMetadata: metadata about a published PLL file
- MerkleProof: inclusion proof for a single PLL record
- ProofEpoch: complete published proof epoch
"""

from datetime import date
from decimal import Decimal
from pathlib import Path

from pydantic import BaseModel, Field


class UserBalance(BaseModel):
    """A user's raw balance as held in the exchange's internal database.

    This is private data — never published directly.
    """

    user_id: str = Field(description="Unique user identifier (private)")
    asset: str = Field(default="BTC", description="Asset type")
    balance: Decimal = Field(ge=0, description="User's balance (non-negative)")


class Token(BaseModel):
    """A single tokenized balance unit produced by the Balance Tokenizer.

    Each token has a unique UUID derived from:
        UUID = SHA-256(user_id || token || value || proof_id)
    """

    uuid: str = Field(description="Unique token identifier (hex hash)")
    token: str = Field(description="Token denomination label, e.g. TBTC-1, TBTC-0.1")
    value: Decimal = Field(description="Numeric value of the token")
    user_id: str = Field(description="Owning user (private — stripped before publishing)")


class PLLRecord(BaseModel):
    """One row in the Public Liability Ledger.

    This is the public-facing representation — no user_id.
    Format: (uuid, token, value)
    """

    uuid: str = Field(description="Unique token identifier (hex hash)")
    token: str = Field(description="Token denomination label, e.g. TBTC-1, TBTC-0.1")
    value: Decimal = Field(description="Numeric value of the token")


class PLLMetadata(BaseModel):
    """Metadata about a published PLL file.

    Published alongside the PLL CSV as metadata.json.
    """

    proof_id: str = Field(description="Proof epoch identifier (YYYY-MM-DD)")
    epoch_date: date = Field(description="Snapshot date")
    asset: str = Field(default="BTC", description="Asset type")
    record_count: int = Field(ge=0, description="Total number of PLL records")
    total_sum: Decimal = Field(ge=0, description="Sum of all token values")
    pll_path: str = Field(description="Relative path to PLL CSV file")


class MerkleProof(BaseModel):
    """Inclusion proof for a single PLL record in the Merkle tree.

    Contains the sibling path from leaf to root, enabling independent
    verification that a record is committed in the published root.
    """

    leaf_hash: str = Field(description="Hash of the PLL record (hex)")
    leaf_index: int = Field(ge=0, description="Position of the leaf in the tree")
    siblings: list[tuple[str, str]] = Field(
        description="List of (hash_hex, direction) pairs. Direction is 'L' or 'R'."
    )
    root: str = Field(description="Expected Merkle root (hex)")


class ProofEpoch(BaseModel):
    """A complete published proof epoch.

    Represents all artifacts generated for a single daily snapshot.
    """

    proof_id: str = Field(description="Proof epoch identifier (YYYY-MM-DD)")
    merkle_root: str = Field(description="Binding Merkle commitment (hex)")
    metadata: PLLMetadata = Field(description="PLL metadata")
    output_dir: Path = Field(description="Directory containing proof artifacts")
