"""Tests for the Public Liability Ledger (Protocol 2)."""

from decimal import Decimal
from pathlib import Path

import pytest

from lpor.core.ledger import PLLReader, PLLWriter
from lpor.core.tokenizer import tokenize_balance
from lpor.models.schemas import PLLRecord, Token, UserBalance


@pytest.fixture
def pll_path(tmp_path: Path) -> Path:
    return tmp_path / "pll.csv"


@pytest.fixture
def sample_tokens() -> list[Token]:
    user = UserBalance(user_id="test_user", balance=Decimal("1.12"))
    return tokenize_balance(user, "2026-01-15")


class TestPLLWriter:
    def test_creates_csv_with_header(self, pll_path: Path) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        writer.finalize()
        content = pll_path.read_text()
        assert content.startswith("uuid,token,value\n")

    def test_writes_tokens(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for token in sample_tokens:
            writer.write_token(token)
        metadata = writer.finalize()
        assert metadata.record_count == 4
        assert metadata.total_sum == Decimal("1.12")
        assert metadata.proof_id == "2026-01-15"

    def test_writes_records_directly(self, pll_path: Path) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        writer.write_record(PLLRecord(uuid="abc", token="TBTC-1", value=Decimal("1")))
        writer.write_record(PLLRecord(uuid="def", token="TBTC-0.1", value=Decimal("0.1")))
        metadata = writer.finalize()
        assert metadata.record_count == 2
        assert metadata.total_sum == Decimal("1.1")

    def test_context_manager(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        with PLLWriter(pll_path, proof_id="2026-01-15") as writer:
            for token in sample_tokens:
                writer.write_token(token)
        assert pll_path.exists()

    def test_creates_parent_directories(self, tmp_path: Path) -> None:
        nested = tmp_path / "proofs" / "2026-01-15" / "pll.csv"
        writer = PLLWriter(nested, proof_id="2026-01-15")
        writer.finalize()
        assert nested.exists()


class TestPLLReader:
    def test_iterates_records(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for token in sample_tokens:
            writer.write_token(token)
        writer.finalize()

        reader = PLLReader(pll_path)
        records = list(reader)
        assert len(records) == 4
        assert all(isinstance(r, PLLRecord) for r in records)

    def test_compute_total(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for token in sample_tokens:
            writer.write_token(token)
        writer.finalize()

        reader = PLLReader(pll_path)
        assert reader.compute_total() == Decimal("1.12")

    def test_find_uuids_all_found(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for token in sample_tokens:
            writer.write_token(token)
        writer.finalize()

        reader = PLLReader(pll_path)
        search = {sample_tokens[0].uuid, sample_tokens[1].uuid}
        found = reader.find_uuids(search)
        assert len(found) == 2

    def test_find_uuids_none_found(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for token in sample_tokens:
            writer.write_token(token)
        writer.finalize()

        reader = PLLReader(pll_path)
        found = reader.find_uuids({"nonexistent"})
        assert found == []

    def test_file_not_found(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            PLLReader(tmp_path / "nonexistent.csv")

    def test_record_count(self, pll_path: Path, sample_tokens: list[Token]) -> None:
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for token in sample_tokens:
            writer.write_token(token)
        writer.finalize()

        reader = PLLReader(pll_path)
        assert reader.record_count() == 4


class TestPLLMultiUser:
    def test_multi_user_pll(self, pll_path: Path) -> None:
        users = [
            UserBalance(user_id="alice", balance=Decimal("1.12")),
            UserBalance(user_id="bob", balance=Decimal("10")),
            UserBalance(user_id="carol", balance=Decimal("0.5")),
        ]
        writer = PLLWriter(pll_path, proof_id="2026-01-15")
        for user in users:
            for token in tokenize_balance(user, "2026-01-15"):
                writer.write_token(token)
        metadata = writer.finalize()

        assert metadata.total_sum == Decimal("11.62")

        # Find alice's tokens
        reader = PLLReader(pll_path)
        alice_tokens = tokenize_balance(users[0], "2026-01-15")
        found = reader.find_uuids({t.uuid for t in alice_tokens})
        assert len(found) == len(alice_tokens)
