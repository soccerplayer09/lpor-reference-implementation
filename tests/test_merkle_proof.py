"""Tests for Merkle proof generation/verification and mmap storage."""

from decimal import Decimal
from pathlib import Path

import pytest

from lpor.core.ledger import PLLWriter
from lpor.core.merkle import MerkleTree, hash_pll_record, verify_proof
from lpor.core.tokenizer import tokenize_balance
from lpor.models.schemas import PLLRecord, UserBalance


@pytest.fixture
def sample_records() -> list[PLLRecord]:
    return [
        PLLRecord(uuid="aaa111", token="TBTC-1", value=Decimal("1")),
        PLLRecord(uuid="bbb222", token="TBTC-0.1", value=Decimal("0.1")),
        PLLRecord(uuid="ccc333", token="TBTC-0.01", value=Decimal("0.01")),
        PLLRecord(uuid="ddd444", token="TBTC-10", value=Decimal("10")),
    ]


class TestMerkleProof:
    def test_generate_and_verify_all_leaves(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        tree.build_from_records(iter(sample_records))
        for i in range(len(sample_records)):
            proof = tree.generate_proof(i)
            assert verify_proof(proof)

    def test_proof_has_correct_leaf_hash(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        tree.build_from_records(iter(sample_records))
        proof = tree.generate_proof(0)
        expected = hash_pll_record(sample_records[0]).hex()
        assert proof.leaf_hash == expected

    def test_proof_root_matches_tree(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        tree.build_from_records(iter(sample_records))
        proof = tree.generate_proof(2)
        assert proof.root == tree.root_hex

    def test_tampered_leaf_fails(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        tree.build_from_records(iter(sample_records))
        proof = tree.generate_proof(0)
        tampered = proof.model_copy(update={"leaf_hash": "ff" * 32})
        assert not verify_proof(tampered)

    def test_wrong_root_fails(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        tree.build_from_records(iter(sample_records))
        proof = tree.generate_proof(0)
        tampered = proof.model_copy(update={"root": "00" * 32})
        assert not verify_proof(tampered)

    def test_invalid_index_raises(self, sample_records: list[PLLRecord]) -> None:
        tree = MerkleTree()
        tree.build_from_records(iter(sample_records))
        with pytest.raises(ValueError, match="out of range"):
            tree.generate_proof(10)

    def test_proof_before_build_raises(self) -> None:
        tree = MerkleTree()
        with pytest.raises(ValueError, match="not built"):
            tree.generate_proof(0)


class TestMerkleTreeMmap:
    def test_mmap_same_root(self, tmp_path: Path, sample_records: list[PLLRecord]) -> None:
        tree_mem = MerkleTree()
        tree_mem.build_from_records(iter(sample_records))

        tree_mmap = MerkleTree(output_path=tmp_path / "tree.bin", use_mmap=True)
        tree_mmap.build_from_records(iter(sample_records))

        assert tree_mem.root_hex == tree_mmap.root_hex
        tree_mmap.close()

    def test_mmap_creates_file(self, tmp_path: Path, sample_records: list[PLLRecord]) -> None:
        tree_path = tmp_path / "tree.bin"
        with MerkleTree(output_path=tree_path, use_mmap=True) as tree:
            tree.build_from_records(iter(sample_records))
        assert tree_path.exists()
        # 4 leaves -> capacity 4, total nodes 8, size = 8 * 32 = 256
        assert tree_path.stat().st_size == 256


class TestEndToEnd:
    def test_full_workflow(self, tmp_path: Path) -> None:
        proof_id = "2026-01-15"
        pll_path = tmp_path / "pll.csv"

        users = [
            UserBalance(user_id="alice", balance=Decimal("1.12")),
            UserBalance(user_id="bob", balance=Decimal("10")),
        ]

        writer = PLLWriter(pll_path, proof_id=proof_id)
        for user in users:
            for token in tokenize_balance(user, proof_id):
                writer.write_token(token)
        writer.finalize()

        tree = MerkleTree()
        root = tree.build_from_pll(pll_path)

        proof = tree.generate_proof(0)
        assert verify_proof(proof)
        assert proof.root == root
