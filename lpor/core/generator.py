"""Synthetic data generator for LPOR benchmarks and demos.

Generates realistic user balance datasets using a log-normal distribution,
which matches empirical patterns observed in cryptocurrency exchanges:
- Most users have small balances
- A few "whales" have very large balances

Balances are rounded to the minimum LPOR denomination (0.01 BTC) to ensure
they are fully representable by the Balance Tokenizer.
"""

import random
from collections.abc import Iterator
from decimal import Decimal

from lpor.models.schemas import UserBalance

# Default parameters for the log-normal distribution
# These produce a distribution where:
# - Median balance ~0.1 BTC
# - Mean balance ~1.5 BTC
# - Max balance ~100+ BTC (rare whales)
DEFAULT_MU = -2.3  # log-space mean
DEFAULT_SIGMA = 2.0  # log-space standard deviation

# Minimum denomination in LPOR
MIN_DENOMINATION = Decimal("0.01")


def _round_to_denomination(value: float) -> Decimal:
    """Round a float balance to the nearest 0.01 (minimum LPOR denomination).

    Ensures the balance is fully representable by the tokenizer.
    Returns 0.01 as minimum (no zero balances in the dataset).
    """
    # Round to 2 decimal places
    rounded = round(value, 2)
    # Ensure minimum balance of 0.01
    if rounded < 0.01:
        rounded = 0.01
    return Decimal(str(rounded))


def generate_users(
    n: int,
    seed: int = 42,
    mu: float = DEFAULT_MU,
    sigma: float = DEFAULT_SIGMA,
    asset: str = "BTC",
) -> Iterator[UserBalance]:
    """Generate synthetic user balances with a log-normal distribution.

    Args:
        n: Number of users to generate.
        seed: Random seed for reproducibility.
        mu: Log-space mean parameter.
        sigma: Log-space standard deviation parameter.
        asset: Asset type (default: BTC).

    Yields:
        UserBalance objects with realistic balance distributions.
    """
    rng = random.Random(seed)

    for i in range(n):
        # Log-normal distribution for balance
        raw_balance = rng.lognormvariate(mu, sigma)
        balance = _round_to_denomination(raw_balance)

        yield UserBalance(
            user_id=f"user_{i:08d}",
            asset=asset,
            balance=balance,
        )


def generate_users_list(
    n: int,
    seed: int = 42,
    mu: float = DEFAULT_MU,
    sigma: float = DEFAULT_SIGMA,
    asset: str = "BTC",
) -> list[UserBalance]:
    """Generate synthetic user balances as a list (for small datasets).

    Same as generate_users but returns a list instead of an iterator.
    Use generate_users() for large datasets to avoid memory issues.

    Args:
        n: Number of users to generate.
        seed: Random seed for reproducibility.
        mu: Log-space mean parameter.
        sigma: Log-space standard deviation parameter.
        asset: Asset type (default: BTC).

    Returns:
        List of UserBalance objects.
    """
    return list(generate_users(n, seed, mu, sigma, asset))


def dataset_stats(users: list[UserBalance]) -> dict[str, Decimal | int]:
    """Compute summary statistics for a user balance dataset.

    Args:
        users: List of UserBalance objects.

    Returns:
        Dictionary with count, total, min, max, mean, median balances.
    """
    balances = sorted(u.balance for u in users)
    n = len(balances)

    if n == 0:
        return {
            "count": 0,
            "total": Decimal("0"),
            "min": Decimal("0"),
            "max": Decimal("0"),
            "mean": Decimal("0"),
            "median": Decimal("0"),
        }

    total = sum(balances)
    median = balances[n // 2] if n % 2 == 1 else (balances[n // 2 - 1] + balances[n // 2]) / 2

    return {
        "count": n,
        "total": total,
        "min": balances[0],
        "max": balances[-1],
        "mean": total / n,
        "median": median,
    }
