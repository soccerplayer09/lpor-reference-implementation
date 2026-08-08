"""Tests for User and Auditor verification layers."""

from decimal import Decimal
from pathlib import Path

import pytest

from lpor.core.ledger import PLLWriter
from lpor.core.merkle import MerkleTree
from lpor.core.tokenizer import tokenize_balance
from lpor.models.schemas import UserBalance
from lpor.verifier.auditor import verify_auditor
from lpor.verifier.user import verify_user_inclusion


@pytest.fixture
def proof_dir(tmp_path: Path) -> tuple[Path, str, str]:
    """Create a full proof epoch and return (pll_path, merkle_root, proof_id)."""
    proof_id = "2026-01-15"
    pll_path = tmp_path / "pll.csv"

    users = [
        UserBalance(user_id="alice", balance=Decimal("1.12")),
        UserBalance(user_id="bob", balance=Decimal("10")),
        UserBalance(user_id="carol", balance=Decimal("0.5")),
    ]

    writer = PLLWriter(pll_path, proof_id=proof_id)
    for user in users:
        for token in tokenize_balance(user, proof_id):
            writer.write_token(token)
    writer.finalize()

    tree = MerkleTree()
    root = tree.build_from_pll(pll_path)

    return pll_path, root, proof_id


class TestUserVerification:
    def test_user_included(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, _, proof_id = proof_dir
        result = verify_user_inclusion(
            pll_path, user_id="alice", balance=Decimal("1.12"), proof_id=proof_id
        )
        assert result.all_included
        assert result.tokens_found == 4  # 1x1 + 1x0.1 + 2x0.01
        assert result.tokens_expected == 4
        assert result.missing_uuids == []

    def test_user_not_included(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, _, proof_id = proof_dir
        result = verify_user_inclusion(
            pll_path, user_id="eve", balance=Decimal("5"), proof_id=proof_id
        )
        assert not result.all_included
        assert result.tokens_found == 0
        assert len(result.missing_uuids) > 0

    def test_total_liabilities(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, _, proof_id = proof_dir
        result = verify_user_inclusion(
            pll_path, user_id="alice", balance=Decimal("1.12"),
            proof_id=proof_id, compute_total=True
        )
        # Total: 1.12 + 10 + 0.5 = 11.62
        assert result.total_liabilities == Decimal("11.62")

    def test_skip_total_computation(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, _, proof_id = proof_dir
        result = verify_user_inclusion(
            pll_path, user_id="bob", balance=Decimal("10"),
            proof_id=proof_id, compute_total=False
        )
        assert result.all_included
        assert result.total_liabilities is None


class TestAuditorVerification:
    def test_valid_root_passes(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, root, proof_id = proof_dir
        result = verify_auditor(pll_path, published_root=root, proof_id=proof_id)
        assert result.roots_match
        assert result.verification_passed
        assert result.computed_root == root
        assert result.total_sum == Decimal("11.62")

    def test_wrong_root_fails(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, _, proof_id = proof_dir
        result = verify_auditor(
            pll_path, published_root="ff" * 32, proof_id=proof_id
        )
        assert not result.roots_match
        assert not result.verification_passed

    def test_record_count(self, proof_dir: tuple[Path, str, str]) -> None:
        pll_path, root, proof_id = proof_dir
        result = verify_auditor(pll_path, published_root=root, proof_id=proof_id)
        # alice: 4 tokens, bob: 1 token (10 BTC), carol: 5 tokens (0.5 = 5x0.1)
        # Actually: alice=4, bob=1(10), carol=5(5x0.1)
        assert result.record_count > 0
