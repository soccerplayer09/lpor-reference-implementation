"""Omission Detectability Analysis — reproduces Table IV from the paper.

Models how LPOR improves the probability of detecting omitted liabilities
by increasing user participation through low-friction verification.

Core formula:
    P_detect = 1 - (1 - p)^k

Where:
    p = probability that a user performs inclusion verification
    k = number of omitted users

The key insight: LPOR's simplified verification increases p (participation rate),
which substantially improves detection probability without changing the
underlying cryptographic construction.
"""

from dataclasses import dataclass


@dataclass
class DetectabilityResult:
    """Result of a detectability analysis."""

    participation_rate: float
    omitted_users: int
    detection_probability: float
    scheme: str


def detection_probability(p: float, k: int) -> float:
    """Compute omission detection probability.

    P_detect = 1 - (1 - p)^k

    An omission is detected if at least one omitted user verifies their inclusion.

    Args:
        p: Participation rate (probability a user verifies), in [0, 1].
        k: Number of omitted users.

    Returns:
        Probability that at least one omission is detected.
    """
    if p < 0 or p > 1:
        raise ValueError(f"Participation rate p must be in [0, 1], got {p}")
    if k < 0:
        raise ValueError(f"Omitted users k must be non-negative, got {k}")
    return 1.0 - (1.0 - p) ** k


def generate_table_iv(
    n: int = 10_000_000,
    omission_fraction: float = 0.00001,
) -> list[DetectabilityResult]:
    """Reproduce Table IV from the paper.

    Compares detection probability across different participation rates
    for Merkle PoR vs LPOR.

    Args:
        n: Total number of users (default: 10^7).
        omission_fraction: Fraction of users omitted (default: 0.001% = 0.00001).

    Returns:
        List of DetectabilityResult for each scenario.
    """
    k = int(n * omission_fraction)  # omitted users (100 for default params)

    scenarios = [
        # (participation_rate, scheme_name)
        (0.0001, "Merkle PoR (conservative)"),
        (0.001, "Merkle PoR (optimistic)"),
        (0.005, "LPOR (conservative)"),
        (0.01, "LPOR (moderate)"),
        (0.05, "LPOR (optimistic)"),
    ]

    results = []
    for rate, scheme in scenarios:
        p_detect = detection_probability(rate, k)
        results.append(
            DetectabilityResult(
                participation_rate=rate,
                omitted_users=k,
                detection_probability=p_detect,
                scheme=scheme,
            )
        )

    return results


def format_table(results: list[DetectabilityResult]) -> str:
    """Format detectability results as a readable table.

    Args:
        results: List of DetectabilityResult objects.

    Returns:
        Formatted table string.
    """
    lines = []
    lines.append(f"{'Rate':>8}  {'Scheme':<30}  {'Detection Prob.':>15}")
    lines.append("-" * 58)

    for r in results:
        rate_pct = f"{r.participation_rate * 100:.2f}%"
        prob_pct = f"{r.detection_probability * 100:.2f}%"
        lines.append(f"{rate_pct:>8}  {r.scheme:<30}  {prob_pct:>15}")

    return "\n".join(lines)
