"""Merkle Tree — Commitment layer of the LPOR framework.

Builds a binary Merkle tree over PLL records, where each leaf is:

    L_i = SHA-256(uuid_i || token_i || value_i)

The resulting root R is a binding commitment to the full liability set.

Storage options:
  - In-memory: for small datasets (< 10^6 records)
  - mmap-backed: for large datasets (10^6 - 10^7+ records)

The tree is stored as a flat array of 32-byte SHA-256 hashes.
For N leaves, the tree has (2*next_power_of_2(N) - 1) nodes, but we store
2*next_power_of_2(N) nodes for simplicity (index 0 unused, root at index 1).
"""

import hashlib
import mmap
from collections.abc import Iterator
from decimal import Decimal
from pathlib import Path

from lpor.core.ledger import PLLReader
from lpor.models.schemas import MerkleProof, PLLRecord

# Each node is a SHA-256 hash = 32 bytes
HASH_SIZE = 32

# Empty leaf hash (SHA-256 of empty string) for padding
EMPTY_HASH = hashlib.sha256(b"").digest()


def hash_pll_record(record: PLLRecord) -> bytes:
    """Compute the leaf hash for a PLL record.

    L_i = SHA-256(uuid_i || token_i || value_i)

    Args:
        record: A PLL record.

    Returns:
        32-byte SHA-256 hash.
    """
    payload = f"{record.uuid}||{record.token}||{record.value}"
    return hashlib.sha256(payload.encode()).digest()


def hash_pll_values(uuid: str, token: str, value: Decimal) -> bytes:
    """Compute leaf hash from raw values (avoids constructing a PLLRecord).

    Args:
        uuid: Token UUID hex string.
        token: Token denomination label.
        value: Token value.

    Returns:
        32-byte SHA-256 hash.
    """
    payload = f"{uuid}||{token}||{value}"
    return hashlib.sha256(payload.encode()).digest()


def _parent_hash(left: bytes, right: bytes) -> bytes:
    """Compute parent node hash from two children.

    H(left || right)
    """
    return hashlib.sha256(left + right).digest()


def _next_power_of_2(n: int) -> int:
    """Return the smallest power of 2 >= n."""
    if n <= 1:
        return 1
    p = 1
    while p < n:
        p <<= 1
    return p


class MerkleTree:
    """Binary Merkle tree with optional mmap-backed storage.

    Tree layout (1-indexed array):
      - Index 1: root
      - Index 2, 3: children of root
      - Leaves start at index `capacity` (where capacity = next_power_of_2(N))
      - Total nodes stored: 2 * capacity

    For 10^7 leaves: capacity=2^24=16M, tree size=32M nodes * 32 bytes = 1 GB
    """

    def __init__(
        self,
        output_path: Path | None = None,
        use_mmap: bool = False,
    ) -> None:
        """Initialize Merkle tree builder.

        Args:
            output_path: Path to store the tree binary file. Required if use_mmap=True.
            use_mmap: Use mmap-backed file storage (recommended for large datasets).
        """
        self._output_path = output_path
        self._use_mmap = use_mmap
        self._tree: bytearray | mmap.mmap | None = None
        self._capacity = 0  # Number of leaf slots (power of 2)
        self._num_leaves = 0  # Actual number of leaves
        self._root: bytes = EMPTY_HASH

    @property
    def root(self) -> bytes:
        """The Merkle root hash (32 bytes)."""
        return self._root

    @property
    def root_hex(self) -> str:
        """The Merkle root as a hex string."""
        return self._root.hex()

    @property
    def num_leaves(self) -> int:
        """Number of actual leaves in the tree."""
        return self._num_leaves

    def build_from_pll(self, pll_path: Path) -> str:
        """Build the Merkle tree from a PLL CSV file.

        Streams the PLL file, computes leaf hashes, and builds the tree bottom-up.

        Args:
            pll_path: Path to the PLL CSV file.

        Returns:
            Merkle root as hex string.
        """
        reader = PLLReader(pll_path)
        return self.build_from_records(iter(reader))

    def build_from_records(self, records: Iterator[PLLRecord]) -> str:
        """Build the Merkle tree from an iterator of PLL records.

        Args:
            records: Iterator of PLLRecord objects.

        Returns:
            Merkle root as hex string.
        """
        # First pass: compute all leaf hashes
        leaf_hashes: list[bytes] = []
        for record in records:
            leaf_hashes.append(hash_pll_record(record))

        return self.build_from_hashes(leaf_hashes)

    def build_from_hashes(self, leaf_hashes: list[bytes]) -> str:
        """Build the Merkle tree from pre-computed leaf hashes.

        Args:
            leaf_hashes: List of 32-byte leaf hashes.

        Returns:
            Merkle root as hex string.
        """
        self._num_leaves = len(leaf_hashes)

        if self._num_leaves == 0:
            self._root = EMPTY_HASH
            return self.root_hex

        self._capacity = _next_power_of_2(self._num_leaves)
        total_nodes = 2 * self._capacity  # Index 0 unused, so we allocate 2*capacity
        total_bytes = total_nodes * HASH_SIZE

        # Allocate storage
        if self._use_mmap and self._output_path:
            self._output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self._output_path, "wb") as f:
                f.write(b"\x00" * total_bytes)
            self._file = open(self._output_path, "r+b")
            self._tree = mmap.mmap(self._file.fileno(), total_bytes)
        else:
            self._tree = bytearray(total_bytes)

        # Write leaves (starting at index self._capacity)
        for i, h in enumerate(leaf_hashes):
            offset = (self._capacity + i) * HASH_SIZE
            self._tree[offset : offset + HASH_SIZE] = h

        # Pad remaining leaves with EMPTY_HASH
        for i in range(self._num_leaves, self._capacity):
            offset = (self._capacity + i) * HASH_SIZE
            self._tree[offset : offset + HASH_SIZE] = EMPTY_HASH

        # Build tree bottom-up
        for i in range(self._capacity - 1, 0, -1):
            left_offset = (2 * i) * HASH_SIZE
            right_offset = (2 * i + 1) * HASH_SIZE
            left = bytes(self._tree[left_offset : left_offset + HASH_SIZE])
            right = bytes(self._tree[right_offset : right_offset + HASH_SIZE])
            parent = _parent_hash(left, right)
            parent_offset = i * HASH_SIZE
            self._tree[parent_offset : parent_offset + HASH_SIZE] = parent

        # Root is at index 1
        root_offset = 1 * HASH_SIZE
        self._root = bytes(self._tree[root_offset : root_offset + HASH_SIZE])

        return self.root_hex

    def generate_proof(self, leaf_index: int) -> MerkleProof:
        """Generate an inclusion proof for a leaf at the given index.

        Args:
            leaf_index: 0-based index of the leaf.

        Returns:
            MerkleProof with the sibling path from leaf to root.

        Raises:
            ValueError: If tree is not built or index is out of range.
        """
        if self._tree is None:
            raise ValueError("Tree not built. Call build_from_* first.")
        if leaf_index < 0 or leaf_index >= self._num_leaves:
            raise ValueError(
                f"Leaf index {leaf_index} out of range [0, {self._num_leaves})"
            )

        # Get leaf hash
        tree_index = self._capacity + leaf_index
        leaf_offset = tree_index * HASH_SIZE
        leaf_hash = bytes(self._tree[leaf_offset : leaf_offset + HASH_SIZE])

        # Walk up the tree collecting siblings
        siblings: list[tuple[str, str]] = []
        current = tree_index

        while current > 1:
            if current % 2 == 0:
                # Current is left child — sibling is right
                sibling_index = current + 1
                direction = "R"
            else:
                # Current is right child — sibling is left
                sibling_index = current - 1
                direction = "L"

            sibling_offset = sibling_index * HASH_SIZE
            sibling_hash = bytes(
                self._tree[sibling_offset : sibling_offset + HASH_SIZE]
            )
            siblings.append((sibling_hash.hex(), direction))

            current //= 2

        return MerkleProof(
            leaf_hash=leaf_hash.hex(),
            leaf_index=leaf_index,
            siblings=siblings,
            root=self.root_hex,
        )

    def close(self) -> None:
        """Close mmap file if using mmap storage."""
        if isinstance(self._tree, mmap.mmap):
            self._tree.close()
            if hasattr(self, "_file"):
                self._file.close()

    def __enter__(self) -> "MerkleTree":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()


def verify_proof(proof: MerkleProof) -> bool:
    """Verify a Merkle inclusion proof.

    Recomputes the root from the leaf hash and sibling path,
    then compares with the expected root in the proof.

    Args:
        proof: The MerkleProof to verify.

    Returns:
        True if the proof is valid (computed root matches expected root).
    """
    current = bytes.fromhex(proof.leaf_hash)

    for sibling_hex, direction in proof.siblings:
        sibling = bytes.fromhex(sibling_hex)
        if direction == "R":
            # Sibling is on the right
            current = _parent_hash(current, sibling)
        else:
            # Sibling is on the left
            current = _parent_hash(sibling, current)

    return current.hex() == proof.root
