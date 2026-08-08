"""Tests for the Balance Tokenizer (Protocol 1)."""

from decimal import Decimal

import pytest

from lpor.core.tokenizer import get_user_uuids, tokenize_balance, tokenize_users
from lpor.models.schemas import UserBalance


class TestTokenizeBalance:
    """Test single-user balance tokenization."""

    def test_exact_denomination(self) -> None:
        user = UserBalance(user_id="user1", balance=Decimal("1"))
        tokens = tokenize_balance(user, "2026-01-15")
        assert len(tokens) == 1
        assert tokens[0].token == "TBTC-1"
        assert tokens[0].value == Decimal("1")

    def test_paper_example(self) -> None:
        """3.12 BTC -> 3x1 + 1x0.1 + 2x0.01 = 6 tokens."""
        user = UserBalance(user_id="user_paper", balance=Decimal("3.12"))
        tokens = tokenize_balance(user, "2026-01-15")
        assert len(tokens) == 6
        values = [t.value for t in tokens]
        assert values.count(Decimal("1")) == 3
        assert values.count(Decimal("0.1")) == 1
        assert values.count(Decimal("0.01")) == 2
        assert sum(values) == Decimal("3.12")

    def test_slide_example(self) -> None:
        """Slide 8: 1.12 BTC -> 1x1 + 1x0.1 + 2x0.01 = 4 tokens."""
        user = UserBalance(user_id="slide_user", balance=Decimal("1.12"))
        tokens = tokenize_balance(user, "2026-01-15")
        assert len(tokens) == 4
        values = [t.value for t in tokens]
        assert values.count(Decimal("1")) == 1
        assert values.count(Decimal("0.1")) == 1
        assert values.count(Decimal("0.01")) == 2
        assert sum(values) == Decimal("1.12")

    def test_large_balance(self) -> None:
        user = UserBalance(user_id="whale", balance=Decimal("25.55"))
        tokens = tokenize_balance(user, "2026-01-15")
        values = [t.value for t in tokens]
        assert sum(values) == Decimal("25.55")
        assert values.count(Decimal("10")) == 2

    def test_zero_balance(self) -> None:
        user = UserBalance(user_id="empty", balance=Decimal("0"))
        tokens = tokenize_balance(user, "2026-01-15")
        assert tokens == []

    def test_minimum_balance(self) -> None:
        user = UserBalance(user_id="min_user", balance=Decimal("0.01"))
        tokens = tokenize_balance(user, "2026-01-15")
        assert len(tokens) == 1
        assert tokens[0].token == "TBTC-0.01"

    def test_non_representable_raises(self) -> None:
        user = UserBalance(user_id="bad", balance=Decimal("1.005"))
        with pytest.raises(ValueError, match="remainder"):
            tokenize_balance(user, "2026-01-15")

    def test_uuid_deterministic(self) -> None:
        user = UserBalance(user_id="det", balance=Decimal("1.1"))
        a = tokenize_balance(user, "2026-01-15")
        b = tokenize_balance(user, "2026-01-15")
        assert [t.uuid for t in a] == [t.uuid for t in b]

    def test_uuid_changes_with_proof_id(self) -> None:
        user = UserBalance(user_id="user1", balance=Decimal("1"))
        a = tokenize_balance(user, "2026-01-15")
        b = tokenize_balance(user, "2026-01-16")
        assert a[0].uuid != b[0].uuid

    def test_uuid_uniqueness_within_user(self) -> None:
        user = UserBalance(user_id="multi", balance=Decimal("3"))
        tokens = tokenize_balance(user, "2026-01-15")
        uuids = [t.uuid for t in tokens]
        assert len(uuids) == len(set(uuids))


class TestTokenizeUsers:
    def test_streams_multiple_users(self) -> None:
        users = iter([
            UserBalance(user_id="u1", balance=Decimal("1")),
            UserBalance(user_id="u2", balance=Decimal("0.1")),
        ])
        tokens = list(tokenize_users(users, "2026-01-15"))
        assert len(tokens) == 2
        assert tokens[0].user_id == "u1"
        assert tokens[1].user_id == "u2"

    def test_empty_user_list(self) -> None:
        tokens = list(tokenize_users(iter([]), "2026-01-15"))
        assert tokens == []


class TestGetUserUuids:
    def test_returns_correct_uuids(self) -> None:
        user = UserBalance(user_id="verify_me", balance=Decimal("2.5"))
        tokens = tokenize_balance(user, "2026-01-15")
        uuids = get_user_uuids("verify_me", Decimal("2.5"), "2026-01-15")
        assert uuids == [t.uuid for t in tokens]
