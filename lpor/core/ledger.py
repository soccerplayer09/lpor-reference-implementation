"""Public Liability Ledger (PLL) — Protocol 2 of the LPOR framework.

The PLL is a publicly accessible CSV file containing tokenized balance records.
It enables:
  - Users to verify inclusion of their tokens (by UUID search)
  - Anyone to compute total liabilities (by summing the value column)
  - Auditors to recompute Merkle commitments (by hashing each row)

Storage is file-backed and streaming — the PLL is never fully loaded into memory.
This supports scaling to 10^7+ users.
"""

import csv
from collections.abc import Iterator
from datetime import date
from decimal import Decimal
from pathlib import Path

from lpor.models.schemas import PLLMetadata, PLLRecord, Token

# CSV column headers
PLL_COLUMNS = ["uuid", "token", "value"]


class PLLWriter:
    """Streams tokenized records to a PLL CSV file on disk.

    Usage:
        writer = PLLWriter(output_dir / "pll.csv", proof_id="2026-01-15")
        for token in tokenize_users(users, proof_id):
            writer.write_token(token)
        metadata = writer.finalize()
    """

    def __init__(self, path: Path, proof_id: str, asset: str = "BTC") -> None:
        """Initialize PLL writer.

        Args:
            path: Output path for the PLL CSV file.
            proof_id: Proof epoch identifier (YYYY-MM-DD).
            asset: Asset type (default: BTC).
        """
        self._path = path
        self._proof_id = proof_id
        self._asset = asset
        self._record_count = 0
        self._total_sum = Decimal("0")

        # Ensure parent directory exists
        path.parent.mkdir(parents=True, exist_ok=True)

        # Open file and write header
        self._file = open(path, "w", newline="")
        self._writer = csv.writer(self._file)
        self._writer.writerow(PLL_COLUMNS)

    def write_token(self, token: Token) -> None:
        """Write a single token as a PLL record (strips user_id).

        Args:
            token: Token to write. The user_id field is not written.
        """
        self._writer.writerow([token.uuid, token.token, str(token.value)])
        self._record_count += 1
        self._total_sum += token.value

    def write_record(self, record: PLLRecord) -> None:
        """Write a PLLRecord directly.

        Args:
            record: PLL record to write.
        """
        self._writer.writerow([record.uuid, record.token, str(record.value)])
        self._record_count += 1
        self._total_sum += record.value

    def finalize(self) -> PLLMetadata:
        """Close the file and return metadata.

        Returns:
            PLLMetadata with record count, total sum, and file path.
        """
        self._file.close()

        return PLLMetadata(
            proof_id=self._proof_id,
            epoch_date=date.fromisoformat(self._proof_id),
            asset=self._asset,
            record_count=self._record_count,
            total_sum=self._total_sum,
            pll_path=str(self._path.name),
        )

    def __enter__(self) -> "PLLWriter":
        return self

    def __exit__(self, *args: object) -> None:
        if not self._file.closed:
            self._file.close()


class PLLReader:
    """Streams PLL records from disk — never loads the full file into memory.

    Usage:
        reader = PLLReader(output_dir / "pll.csv")
        total = reader.compute_total()
        found = reader.find_uuids({"abc123", "def456"})
    """

    def __init__(self, path: Path) -> None:
        """Initialize PLL reader.

        Args:
            path: Path to the PLL CSV file.

        Raises:
            FileNotFoundError: If the PLL file does not exist.
        """
        if not path.exists():
            raise FileNotFoundError(f"PLL file not found: {path}")
        self._path = path

    @property
    def path(self) -> Path:
        """Path to the PLL CSV file."""
        return self._path

    def __iter__(self) -> Iterator[PLLRecord]:
        """Iterate over all PLL records (streaming).

        Yields:
            PLLRecord objects, one per row.
        """
        with open(self._path, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield PLLRecord(
                    uuid=row["uuid"],
                    token=row["token"],
                    value=Decimal(row["value"]),
                )

    def compute_total(self) -> Decimal:
        """Compute the total sum of all token values (streaming).

        This is the user-layer "total liabilities" check.

        Returns:
            Sum of all value fields in the PLL.
        """
        total = Decimal("0")
        for record in self:
            total += record.value
        return total

    def find_uuids(self, uuids: set[str]) -> list[PLLRecord]:
        """Search for specific UUIDs in the PLL (single-pass scan).

        Args:
            uuids: Set of UUID hex strings to search for.

        Returns:
            List of matching PLLRecord objects (in file order).
        """
        found: list[PLLRecord] = []
        remaining = set(uuids)

        for record in self:
            if record.uuid in remaining:
                found.append(record)
                remaining.discard(record.uuid)
                # Early exit if all found
                if not remaining:
                    break

        return found

    def record_count(self) -> int:
        """Count total records (streaming).

        Returns:
            Number of records in the PLL.
        """
        count = 0
        for _ in self:
            count += 1
        return count
