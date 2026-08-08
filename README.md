# LPOR Reference Implementation

> Open-source reference implementation of LPOR for usable and publicly auditable Proof of Reserves.

## What is LPOR?

**LPOR (Layered Proof of Reserves)** is a framework that makes cryptocurrency exchange solvency verification both cryptographically sound and practically usable by everyday users.

The core insight: **a technically valid proof that nobody verifies provides weak practical transparency.** LPOR treats usability itself as a security parameter.

This repository is the reference implementation accompanying the research paper:

> **LPOR: A Layered Proof of Reserves Framework for Usable and Publicly Auditable Solvency Verification**
>
> Published at IEEE ICBC 2026 — International Conference on Blockchain and Cryptocurrency, Brisbane, Australia.

## Purpose

This is a **research reference implementation**, not production-ready software. It is designed to:

1. Serve as a reproducible artifact for the IEEE ICBC 2026 paper
2. Demonstrate concretely how LPOR works end-to-end
3. Allow a third party to understand the core idea and reproduce the main workflow in ~10 minutes
4. Provide a technical reference for researchers and cryptocurrency exchanges
5. Bridge from LPOR research into future Proof of Transaction (PoT) research

## Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

### Installation

```bash
# Clone the repository
git clone https://github.com/donggookim/lpor-reference-implementation.git
cd lpor-reference-implementation

# Install with uv (recommended)
uv sync

# Or install with pip
pip install -e ".[dev]"
```

### Run Tests

```bash
# With uv
uv run pytest

# Or directly
pytest
```

### CLI Usage

```bash
# Check version
lpor version

# Verify an inclusion proof (placeholder — not yet implemented)
lpor verify
```

### Docker

```bash
docker compose up --build
```

## Project Structure

```
lpor-reference-implementation/
├── README.md              # This file
├── LICENSE                # Apache 2.0
├── CITATION.cff           # Machine-readable citation metadata
├── pyproject.toml         # Project configuration and dependencies
├── Dockerfile             # Container image definition
├── docker-compose.yml     # Local orchestration
├── lpor/                  # Main package
│   ├── __init__.py        # Package root, version
│   ├── cli.py             # Typer CLI entry point
│   ├── core/              # Merkle tree, proof generation, commitments
│   ├── models/            # Pydantic data models
│   └── verifier/          # User-facing verification logic
├── tests/                 # pytest test suite
├── examples/              # End-to-end usage examples
├── scripts/               # Utility & benchmark scripts
└── docs/                  # Technical documentation
```

## Architecture (Overview)

LPOR organizes Proof of Reserves into layers:

| Layer | Responsibility |
|-------|---------------|
| **Commitment** | Exchange commits to a liability set via a Merkle sum tree |
| **Proof Generation** | Individual inclusion proofs are generated for each user |
| **Verification** | Users independently verify their inclusion without trusting the exchange |
| **Public Audit** | Aggregated public data enables community-level solvency checks |

Each layer is designed to be independently understandable and verifiable.

## Citation

If you use this work, please cite:

```bibtex
@inproceedings{lpor2026,
  title     = {LPOR: A Layered Proof of Reserves Framework for Usable and Publicly Auditable Solvency Verification},
  author    = {LPOR Research Team},
  booktitle = {2026 IEEE International Conference on Blockchain and Cryptocurrency (ICBC)},
  year      = {2026},
  publisher = {IEEE},
  address   = {Brisbane, Australia}
}
```

## Development

```bash
# Install dev dependencies
uv sync

# Run linter
uv run ruff check lpor/ tests/

# Run type checker
uv run mypy lpor/

# Run tests with coverage
uv run pytest --cov=lpor
```

## Status

🚧 **Early development** — Core structure is in place; implementation of cryptographic primitives and the verification workflow is in progress.

## License

[Apache License 2.0](LICENSE)
