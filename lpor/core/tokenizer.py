"""Balance Tokenizer — Protocol 1 of the LPOR framework.

Converts user balances into standardized denomination tokens using a greedy
decomposition algorithm. Each token receives a deterministic UUID derived from:

    UUID = SHA-256(user_id || token || value || proof_id)

This enables users to independently verify their token inclusion in the PLL
without revealing their identity to external observers.
"""

import hashlib
from collections.abc import Iterator
from decimal import Decimal

from lpor.models.schemas import Token, UserBalance

# Standard TBTC denominations (descending order for greedy decomposition)
DENOMINATIONS: list[Decimal] = [
    Decimal("10"),
    Decimal("1"),
    Decimal("0.1"),
    Decimal("0.01"),
]

# Token label prefix
TOKEN_PREFIX = "TBTC"


def _compute_uuid(user_id: str, token_label: str, value: Decimal, proof_id: str) -> str:
    """Compute deterministic UUID for a token.

    UUID = SHA-256(user_id || token || value || proof_id)

    Returns the full hex digest (64 characters).
    """
    payload = f"{user_id}||{token_label}||{value}||{proof_id}"
    return hashlib.sha256(payload.encode()).hexdigest()


def _denomination_label(value: Decimal) -> str:
    """Create token denomination label, e.g. TBTC-1, TBTC-0.1."""
    # Normalize to remove trailing zeros for clean labels
    normalized = value.normalize()
    return f"{TOKEN_PREFIX}-{normalized}"


def tokenize_balance(user: UserBalance, proof_id: str) -> list[Token]:
    """Decompose a user's balance into standardized denomination tokens.

    Uses a greedy algorithm: decomposes the balance using the largest
    denomination first, working down to the smallest.

    Args:
        user: The user's balance record.
        proof_id: The proof epoch identifier (e.g. "2026-01-15").

    Returns:
        List of Token objects representing the decomposed balance.

    Raises:
        ValueError: If balance cannot be fully decomposed (remainder > 0
                    after all denominations exhausted).
    """
    tokens: list[Token] = []
    remaining = user.balance
    token_index = 0

    for denomination in DENOMINATIONS:
        while remaining >= denomination:
            token_label = _denomination_label(denomination)

            # Each token of the same denomination for the same user needs
            # a unique UUID. We append the token_index to ensure uniqueness.
            uuid = _compute_uuid(
                user.user_id, token_label, denomination, f"{proof_id}:{token_index}"
            )

            tokens.append(
                Token(
                    uuid=uuid,
                    token=token_label,
                    value=denomination,
                    user_id=user.user_id,
                )
            )
            remaining -= denomination
            token_index += 1

    if remaining > Decimal("0"):
        raise ValueError(
            f"Balance {user.balance} for user {user.user_id} has remainder "
            f"{remaining} that cannot be decomposed into standard denominations. "
            f"Minimum denomination is {DENOMINATIONS[-1]}."
        )

    return tokens


def tokenize_users(
    users: Iterator[UserBalance], proof_id: str
) -> Iterator[Token]:
    """Stream-tokenize multiple users' balances.

    Yields tokens one at a time — never holds all tokens in memory.

    Args:
        users: Iterator of user balance records.
        proof_id: The proof epoch identifier (e.g. "2026-01-15").

    Yields:
        Token objects for each user's decomposed balance.
    """
    for user in users:
        yield from tokenize_balance(user, proof_id)


def get_user_uuids(user_id: str, balance: Decimal, proof_id: str) -> list[str]:
    """Derive the expected UUIDs for a user's tokens.

    This allows a user to independently compute their expected token UUIDs
    and check for inclusion in the PLL without relying on the exchange.

    Args:
        user_id: The user's identifier.
        balance: The user's balance.
        proof_id: The proof epoch identifier.

    Returns:
        List of expected UUID hex strings.
    """
    user = UserBalance(user_id=user_id, balance=balance)
    tokens = tokenize_balance(user, proof_id)
    return [t.uuid for t in tokens]
