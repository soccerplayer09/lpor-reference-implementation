# LPOR Reference Implementation

> Open-source reference implementation of LPOR for usable and publicly auditable Proof of Reserves.

**[Live Demo →](https://donggookim.com/work/lpor)**

## What is LPOR?

**LPOR (Layered Proof of Reserves)** is a layered, usability-focused PoR framework that separates lightweight user-side checks from auditor-level cryptographic verification, enabling non-technical users to verify inclusion and publicly recompute total liabilities with minimal friction.

Proof of Reserves (PoR) enables centralized crypto exchanges to demonstrate that on-chain reserves are sufficient to cover customer liabilities. However, existing approaches, including Merkle-tree-based proofs and zero-knowledge PoR systems, remain difficult for everyday users to verify in practice, resulting in limited participation and weakened transparency.

LPOR introduces a layered verification approach: by lowering verification barriers, LPOR increases user participation and substantially improves the probability of detecting omitted liabilities. We evaluate its scalability and omission detectability at a multi-million-user scale.

This repository is the reference implementation accompanying the research paper:

> **LPOR: A Layered Proof of Reserves Framework for Usable and Publicly Auditable Solvency Verification**
>
> Donggoo Kim, Rajesh Upadhayaya, Milosz Bator, Tao Le
>
> Published at IEEE ICBC 2026 — International Conference on Blockchain and Cryptocurrency, Brisbane, Australia.

## Purpose

This is a **research reference implementation**, not production-ready software. It is designed to:

1. Serve as a reproducible artifact for the IEEE ICBC 2026 paper
2. Demonstrate concretely how LPOR works end-to-end
3. Allow a third party to understand the core idea and reproduce the main workflow in ~10 minutes
4. Provide a technical reference for researchers and cryptocurrency exchanges
5. Bridge from LPOR research into future Proof of Transaction (PoT) research

## Live Demo

Try the interactive step-by-step demo: **[donggookim.com/work/lpor](https://donggookim.com/work/lpor)**

The demo walks through the full LPOR protocol:
1. Generate a synthetic user dataset
2. Tokenize balances into the Public Liability Ledger (PLL)
3. Build Merkle commitment + solvency snapshot
4. Public audit — independent verification of the commitment
5. User verification — inclusion check with downloadable PDF report

## Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- Node.js 20+ (for web UI)

### Installation

```bash
git clone https://github.com/donggookim/lpor-reference-implementation.git
cd lpor-reference-implementation

# Install Python package
pip install -e ".[dev]"

# Install frontend dependencies
cd web/frontend && npm install && cd ../..
```

### Run the Web Demo (local)

```bash
# Terminal 1: Start API
uvicorn web.api.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start frontend
cd web/frontend && npm run dev
```

Open **http://localhost:5173**

### CLI Usage

```bash
# Generate a proof epoch (1000 synthetic users)
lpor generate --users 1000 --proof-id 2026-01-15

# User verification
lpor verify-user --proof-dir proofs/2026-01-15 --user-id user_00000000 --balance 0.16

# Auditor verification
lpor verify-auditor --proof-dir proofs/2026-01-15

# Show proof statistics
lpor stats --proof-dir proofs/2026-01-15

# Omission detectability analysis (Table IV)
lpor detectability
```

### Run the End-to-End Example

```bash
python examples/full_workflow.py
```

### Run Tests

```bash
pytest
```

### Run Benchmarks (Table III)

```bash
python scripts/run_benchmark.py --scales 10000 100000 1000000
```

## Project Structure

```
lpor-reference-implementation/
├── lpor/                      # Core Python package
│   ├── cli.py                 # Typer CLI (generate, verify, stats)
│   ├── core/
│   │   ├── tokenizer.py      # Balance Tokenizer (Protocol 1)
│   │   ├── ledger.py         # PLL Writer/Reader (Protocol 2)
│   │   ├── merkle.py         # Merkle tree (mmap-backed)
│   │   ├── generator.py      # Synthetic data generator
│   │   └── detectability.py  # Omission detection model
│   ├── models/
│   │   └── schemas.py        # Pydantic data models
│   └── verifier/
│       ├── user.py            # User-layer verification
│       └── auditor.py         # Auditor-layer verification
├── web/
│   ├── api/
│   │   └── main.py           # FastAPI backend
│   └── frontend/             # React + TypeScript (Vite)
│       └── src/
│           ├── DemoPage.tsx   # Interactive step-by-step demo
│           └── steps/         # UI components per step
├── tests/                     # 53 pytest test cases
├── examples/
│   └── full_workflow.py       # End-to-end demonstration script
├── scripts/
│   └── run_benchmark.py      # Reproduce Table III
├── deploy/                    # Docker deployment config
├── .github/workflows/         # CI/CD pipeline
├── Dockerfile                 # API container
├── docker-compose.yml         # Local development
├── pyproject.toml             # Python project config
├── CITATION.cff               # Machine-readable citation
└── LICENSE                    # Apache 2.0
```

## Architecture

LPOR separates verification into two layers that both anchor to the same Merkle root:

```
┌─────────────────────────────────────────────────┐
│  Auditor Layer (cryptographic binding)          │
│  • Recompute leaf hashes from PLL               │
│  • Rebuild Merkle tree                          │
│  • Verify root matches published commitment     │
├─────────────────────────────────────────────────┤
│  Merkle Tree: R_root                            │
│       h1              h2                        │
│    h1,1  h1,2     h2,1  h2,2                   │
│    L1 L2 L3 L4    L5 L6 L7 L8                  │
├─────────────────────────────────────────────────┤
│  Public Liability Ledger (PLL)                  │
│  PLL1 PLL2 PLL3 PLL4 PLL5 PLL6 PLL7 PLL8      │
├─────────────────────────────────────────────────┤
│  User Layer (human-readable verification)       │
│  • Verify token inclusion by UUID               │
│  • Compute total liabilities (simple sum)       │
│  • No cryptographic operations needed           │
└─────────────────────────────────────────────────┘
```

Key protocol components:
- **Balance Tokenizer**: Decomposes balances into standard denominations (10, 1, 0.1, 0.01 TBTC) with deterministic UUIDs
- **Public Liability Ledger**: CSV file of (UUID, token, value) — human-readable, publicly summable
- **Merkle Commitment**: SHA-256 binary tree over PLL records, binding the ledger cryptographically
- **Omission Detectability**: P_detect = 1 − (1 − p)^k — higher participation → higher detection

## Citation

```bibtex
@inproceedings{lpor2026,
  title     = {LPOR: A Layered Proof of Reserves Framework for Usable and Publicly Auditable Solvency Verification},
  author    = {Donggoo Kim and Rajesh Upadhayaya and Milosz Bator and Tao Le},
  booktitle = {2026 IEEE International Conference on Blockchain and Cryptocurrency (ICBC)},
  year      = {2026},
  publisher = {IEEE},
  address   = {Brisbane, Australia}
}
```

## Development

```bash
# Run linter
ruff check lpor/ tests/

# Run type checker
mypy lpor/

# Run tests with coverage
pytest --cov=lpor

# Build frontend
cd web/frontend && npm run build
```

## License

[Apache License 2.0](LICENSE)
