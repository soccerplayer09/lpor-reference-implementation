"""Tests for the Merkle Tree commitment layer."""

import hashlib
from decimal import Decimal
from pathlib import Path

import pytest

from lpor.core.ledger import PLLWriter
from lpor.core.merkle import EMPTY_HASH, MerkleTree, hash_pll_record
from lpor.models.schemas import PLLRecord


@pytest.fixture
def sample_records() -> list[PLLRecord]:
    return [
        PLLRecord(uuid="aaa111", token="TBTC-1", value=Decimal("1")),
        PLLRecord(uuid="bbb222", token="TBTC-0.1", value=Decimal("0.1")),
        PLLRecord(uuid="ccc333", token="TBTC-0.01", value=Decimal("0.01")),
        PLLRecord(uuid="ddd444", token="TBTC-10", value=Decimal("10")),
    ]


@pytest.fixture
def pll_file(tmp_path: Path, sample_records: list[PLLRecord]) -> Path:
    pll_path = tmp_path / "pll.csv"
    writer = PLLWriter(pll_path, proof_id="2026-01-15")
    for record in sample_records:
        writer.write_record(record)
    writer.finalize()
    return pll_path


class TestHashFunctions:
    def test_hash_pll_record(self) -> None:
        record = PLLRecord(uuid="abc123", token="TBTC-1", value=Decimal("1"))
        h = hash_pll_record(record)
        expected = hashlib.sha256(b"abc123||TBTC-1||1").digest()
        assert h == expected
        assert len(h) == 32

    def test_different_records_different_hashes(self) -> None:
        r1 = PLLRecord(uuid="aaa", token="TBTC-1", value=Decimal("1"))
        r2 = PLLRecord(uuid="bbb", token="TBTC-1", value=Decimal("1"))
        assert hash_pll_record(r1) != hash_pll_record(r2)


class TestMerkleTreeBuild:
    def test_build_from_records(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        root = tree.build_from_records(iter(sample_records))
        assert len(root) == 64
        assert tree.num_leaves == 4

    def test_build_from_pll_file(self, pll_file: Path) -> None:
        tree = MerkleTree()
        root = tree.build_from_pll(pll_file)
        assert len(root) == 64
        assert tree.num_leaves == 4

    def test_build_from_hashes(self) -> None:
        hashes = [hashlib.sha256(f"leaf{i}".encode()).digest() for i in range(8)]
        tree = MerkleTree()
        root = tree.build_from_hashes(hashes)
        assert len(root) == 64
        assert tree.num_leaves == 8

    def test_deterministic_root(self, sample_records: list[PLLRecord]) -> None:
        tree1 = MerkleTree()
        tree1.build_from_records(iter(sample_records))
        tree2 = MerkleTree()
        tree2.build_from_records(iter(sample_records))
        assert tree1.root_hex == tree2.root_hex

    def test_single_leaf(self) -> None:
        records = [PLLRecord(uuid="solo", token="TBTC-1", value=Decimal("1"))]
        tree = MerkleTree()
        root = tree.build_from_records(iter(records))
        assert len(root) == 64
        assert tree.num_leaves == 1

    def test_empty_tree(self) -> None:
        tree = MerkleTree()
        root = tree.build_from_records(iter([]))
        assert root == EMPTY_HASH.hex()

    def test_non_power_of_2_leaves(self) -> None:
        records = [
            PLLRecord(uuid=f"r{i}", token="TBTC-1", value=Decimal("1"))
            for i in range(5)
        ]
        tree = MerkleTree()
        root = tree.build_from_records(iter(records))
        assert len(root) == 64
        assert tree.num_leaves == 5
