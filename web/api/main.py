"""LPOR Web API — FastAPI backend for the interactive demo.

Provides endpoints for the step-by-step LPOR demonstration:
1. Dataset: list synthetic users
2. Tokenize: run Balance Tokenizer, return PLL records with user mapping
3. Generate Proof: build Merkle tree, return root + metadata
4. User Verify: check token inclusion for a specific user
5. Public Audit: download PLL, submit verification results
"""

import json
import time
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from lpor.core.detectability import detection_probability, generate_table_iv
from lpor.core.generator import dataset_stats, generate_users_list
from lpor.core.ledger import PLLReader, PLLWriter
from lpor.core.merkle import MerkleTree, hash_pll_record, verify_proof
from lpor.core.tokenizer import tokenize_balance
from lpor.models.schemas import UserBalance
from lpor.verifier.auditor import verify_auditor
from lpor.verifier.user import verify_user_inclusion

app = FastAPI(
    title="LPOR Interactive Demo",
    description="Interactive demonstration of the LPOR Proof of Reserves framework",
    version="0.1.0",
)

# CORS for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory state for the demo session ────────────────────────────
# This is a single-session demo, not production multi-tenant.

DEMO_DIR = Path("/tmp/lpor_web_demo")
DEMO_PROOF_ID = date.today().isoformat()

# State
_state: dict[str, Any] = {
    "users": None,
    "tokens_by_user": None,
    "pll_path": None,
    "merkle_root": None,
    "metadata": None,
    "tree": None,
    "audit_submissions": [],
}


# ─── Request/Response Models ──────────────────────────────────────────

class GenerateDatasetRequest(BaseModel):
    n_users: int = Field(default=50, ge=5, le=500)
    seed: int = Field(default=42)


class TokenizeResponse(BaseModel):
    users: list[dict]
    pll_records: list[dict]
    user_token_mapping: dict[str, list[dict]]
    total_records: int
    total_sum: str


class GenerateProofResponse(BaseModel):
    merkle_root: str
    record_count: int
    total_sum: str
    generation_time_ms: float
    tree_depth: int


class UserVerifyRequest(BaseModel):
    user_id: str


class UserVerifyResponse(BaseModel):
    user_id: str
    balance: str
    tokens_expected: int
    tokens_found: int
    all_included: bool
    found_records: list[dict]
    missing_uuids: list[str]
    total_liabilities: str


class AuditSubmission(BaseModel):
    verifier_name: str = Field(min_length=1, max_length=50)
    computed_root: str = Field(min_length=64, max_length=64)


class AuditSubmissionResponse(BaseModel):
    verifier_name: str
    computed_root: str
    roots_match: bool
    timestamp: str


class DetectabilityRequest(BaseModel):
    participation_rate: float = Field(ge=0.0001, le=0.5)
    n_users: int = Field(default=10_000_000)
    omission_fraction: float = Field(default=0.00001)


# ─── Endpoints ────────────────────────────────────────────────────────

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


@app.post("/api/dataset")
def generate_dataset(req: GenerateDatasetRequest) -> dict:
    """Step 1: Generate synthetic user dataset."""
    users = generate_users_list(req.n_users, seed=req.seed)
    _state["users"] = users
    _state["tokens_by_user"] = None
    _state["pll_path"] = None
    _state["merkle_root"] = None
    _state["audit_submissions"] = []

    stats = dataset_stats(users)

    return {
        "users": [
            {"user_id": u.user_id, "balance": str(u.balance), "asset": u.asset}
            for u in users
        ],
        "stats": {
            "count": stats["count"],
            "total": str(stats["total"]),
            "min": str(stats["min"]),
            "max": str(stats["max"]),
            "mean": str(round(stats["mean"], 4)),
            "median": str(stats["median"]),
        },
    }


@app.post("/api/tokenize")
def tokenize() -> TokenizeResponse:
    """Step 2: Run Balance Tokenizer on the dataset."""
    if _state["users"] is None:
        raise HTTPException(400, "Generate dataset first (POST /api/dataset)")

    users: list[UserBalance] = _state["users"]
    proof_id = DEMO_PROOF_ID

    # Tokenize all users, tracking mapping
    user_token_mapping: dict[str, list[dict]] = {}
    all_pll_records: list[dict] = []

    for user in users:
        tokens = tokenize_balance(user, proof_id)
        user_tokens = []
        for t in tokens:
            record = {"uuid": t.uuid, "token": t.token, "value": str(t.value)}
            user_tokens.append(record)
            all_pll_records.append({**record, "user_id": user.user_id})
        user_token_mapping[user.user_id] = user_tokens

    _state["tokens_by_user"] = user_token_mapping

    total_sum = sum(Decimal(r["value"]) for r in all_pll_records)

    return TokenizeResponse(
        users=[
            {"user_id": u.user_id, "balance": str(u.balance)} for u in users
        ],
        pll_records=[
            {"uuid": r["uuid"], "token": r["token"], "value": r["value"]}
            for r in all_pll_records
        ],
        user_token_mapping=user_token_mapping,
        total_records=len(all_pll_records),
        total_sum=str(total_sum),
    )


@app.post("/api/generate-proof")
def generate_proof() -> GenerateProofResponse:
    """Step 3: Build Merkle tree and generate commitment."""
    if _state["users"] is None:
        raise HTTPException(400, "Generate dataset first")
    if _state["tokens_by_user"] is None:
        raise HTTPException(400, "Run tokenization first (POST /api/tokenize)")

    users: list[UserBalance] = _state["users"]
    proof_id = DEMO_PROOF_ID

    # Write PLL to disk
    DEMO_DIR.mkdir(parents=True, exist_ok=True)
    pll_path = DEMO_DIR / "pll.csv"

    t_start = time.perf_counter()

    writer = PLLWriter(pll_path, proof_id=proof_id)
    for user in users:
        tokens = tokenize_balance(user, proof_id)
        for token in tokens:
            writer.write_token(token)
    metadata = writer.finalize()

    # Build Merkle tree
    tree = MerkleTree()
    merkle_root = tree.build_from_pll(pll_path)

    t_end = time.perf_counter()

    # Save merkle root
    (DEMO_DIR / "merkle_root.txt").write_text(merkle_root)

    _state["pll_path"] = pll_path
    _state["merkle_root"] = merkle_root
    _state["metadata"] = metadata
    _state["tree"] = tree

    # Compute tree depth
    tree_depth = len(tree.generate_proof(0).siblings) if tree.num_leaves > 0 else 0

    return GenerateProofResponse(
        merkle_root=merkle_root,
        record_count=metadata.record_count,
        total_sum=str(metadata.total_sum),
        generation_time_ms=round((t_end - t_start) * 1000, 2),
        tree_depth=tree_depth,
    )


@app.post("/api/verify/user")
def verify_user(req: UserVerifyRequest) -> UserVerifyResponse:
    """Step 4: User verification — check token inclusion."""
    if _state["pll_path"] is None:
        raise HTTPException(400, "Generate proof first (POST /api/generate-proof)")

    users: list[UserBalance] = _state["users"]
    user = next((u for u in users if u.user_id == req.user_id), None)

    if user is None:
        raise HTTPException(404, f"User '{req.user_id}' not found in dataset")

    result = verify_user_inclusion(
        pll_path=_state["pll_path"],
        user_id=user.user_id,
        balance=user.balance,
        proof_id=DEMO_PROOF_ID,
        compute_total=True,
    )

    return UserVerifyResponse(
        user_id=user.user_id,
        balance=str(user.balance),
        tokens_expected=result.tokens_expected,
        tokens_found=result.tokens_found,
        all_included=result.all_included,
        found_records=[
            {"uuid": r.uuid, "token": r.token, "value": str(r.value)}
            for r in result.found_records
        ],
        missing_uuids=result.missing_uuids,
        total_liabilities=str(result.total_liabilities or "0"),
    )


@app.post("/api/verify/auditor")
def verify_auditor_endpoint() -> dict:
    """Step 5: Auditor verification — recompute Merkle root."""
    if _state["pll_path"] is None or _state["merkle_root"] is None:
        raise HTTPException(400, "Generate proof first")

    t_start = time.perf_counter()
    result = verify_auditor(
        pll_path=_state["pll_path"],
        published_root=_state["merkle_root"],
        proof_id=DEMO_PROOF_ID,
    )
    t_end = time.perf_counter()

    return {
        "published_root": result.published_root,
        "computed_root": result.computed_root,
        "roots_match": result.roots_match,
        "verification_passed": result.verification_passed,
        "record_count": result.record_count,
        "total_sum": str(result.total_sum),
        "verification_time_ms": round((t_end - t_start) * 1000, 2),
    }


@app.get("/api/pll/download")
def download_pll() -> FileResponse:
    """Download the PLL CSV file."""
    if _state["pll_path"] is None:
        raise HTTPException(400, "Generate proof first")
    return FileResponse(
        _state["pll_path"],
        media_type="text/csv",
        filename="pll.csv",
    )


@app.get("/api/script/download")
def download_verification_script() -> dict:
    """Return the verification script content (Python)."""
    script = '''#!/usr/bin/env python3
"""LPOR Public Verification Script.

Downloads the PLL and recomputes the Merkle root to verify
the exchange's published commitment.

Usage:
    python verify_lpor.py pll.csv <published_merkle_root>
"""
import csv
import hashlib
import sys
from decimal import Decimal


def hash_record(uuid: str, token: str, value: str) -> bytes:
    payload = f"{uuid}||{token}||{value}"
    return hashlib.sha256(payload.encode()).digest()


def build_merkle_root(leaf_hashes: list[bytes]) -> bytes:
    n = len(leaf_hashes)
    if n == 0:
        return hashlib.sha256(b"").digest()

    # Pad to power of 2
    capacity = 1
    while capacity < n:
        capacity <<= 1

    empty = hashlib.sha256(b"").digest()
    leaves = leaf_hashes + [empty] * (capacity - n)

    # Build tree bottom-up
    layer = leaves
    while len(layer) > 1:
        next_layer = []
        for i in range(0, len(layer), 2):
            combined = layer[i] + layer[i + 1]
            next_layer.append(hashlib.sha256(combined).digest())
        layer = next_layer

    return layer[0]


def main():
    if len(sys.argv) != 3:
        print("Usage: python verify_lpor.py <pll.csv> <published_root>")
        sys.exit(1)

    pll_path = sys.argv[1]
    published_root = sys.argv[2]

    # Read PLL and compute hashes + sum
    leaf_hashes = []
    total = Decimal("0")

    with open(pll_path) as f:
        reader = csv.DictReader(f)
        for row in reader:
            h = hash_record(row["uuid"], row["token"], row["value"])
            leaf_hashes.append(h)
            total += Decimal(row["value"])

    # Build Merkle tree
    root = build_merkle_root(leaf_hashes)
    computed_root = root.hex()

    # Report
    print(f"Records:        {len(leaf_hashes):,}")
    print(f"Total sum:      {total} BTC")
    print(f"Published root: {published_root}")
    print(f"Computed root:  {computed_root}")
    print()

    if computed_root == published_root:
        print("✓ VERIFICATION PASSED — roots match")
    else:
        print("✗ VERIFICATION FAILED — roots DO NOT match")
        sys.exit(1)


if __name__ == "__main__":
    main()
'''
    return {"filename": "verify_lpor.py", "content": script}


@app.post("/api/audit/submit")
def submit_audit(submission: AuditSubmission) -> AuditSubmissionResponse:
    """Submit a public verification result."""
    if _state["merkle_root"] is None:
        raise HTTPException(400, "No proof generated yet")

    from datetime import datetime

    roots_match = submission.computed_root == _state["merkle_root"]
    timestamp = datetime.now().isoformat()

    result = AuditSubmissionResponse(
        verifier_name=submission.verifier_name,
        computed_root=submission.computed_root,
        roots_match=roots_match,
        timestamp=timestamp,
    )

    _state["audit_submissions"].append(result.model_dump())
    return result


@app.get("/api/audit/results")
def get_audit_results() -> dict:
    """Get all submitted audit results."""
    return {
        "published_root": _state.get("merkle_root", ""),
        "submissions": _state["audit_submissions"],
        "total_verifiers": len(_state["audit_submissions"]),
        "matching_count": sum(
            1 for s in _state["audit_submissions"] if s["roots_match"]
        ),
    }


@app.post("/api/detectability")
def compute_detectability(req: DetectabilityRequest) -> dict:
    """Compute omission detection probability for given parameters."""
    k = int(req.n_users * req.omission_fraction)
    p_detect = detection_probability(req.participation_rate, k)

    return {
        "participation_rate": req.participation_rate,
        "n_users": req.n_users,
        "omission_fraction": req.omission_fraction,
        "omitted_users_k": k,
        "detection_probability": round(p_detect, 6),
        "detection_percentage": f"{p_detect * 100:.2f}%",
    }


@app.get("/api/detectability/table")
def get_detectability_table() -> dict:
    """Get the full Table IV comparison."""
    results = generate_table_iv()
    return {
        "assumptions": {
            "n_users": 10_000_000,
            "omission_fraction": 0.00001,
            "omitted_users_k": 100,
        },
        "results": [
            {
                "participation_rate": r.participation_rate,
                "participation_pct": f"{r.participation_rate * 100:.2f}%",
                "scheme": r.scheme,
                "detection_probability": round(r.detection_probability, 4),
                "detection_pct": f"{r.detection_probability * 100:.2f}%",
            }
            for r in results
        ],
    }
