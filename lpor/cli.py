"""LPOR CLI — command-line interface for the reference implementation.

Commands:
    lpor version          Print version
    lpor generate         Generate a proof epoch from synthetic data
    lpor verify-user      Perform user-layer verification
    lpor verify-auditor   Perform auditor-layer verification
    lpor stats            Show proof epoch statistics
    lpor detectability    Show omission detectability analysis (Table IV)
"""

import json
import time
from datetime import date
from decimal import Decimal
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from lpor import __version__

app = typer.Typer(
    name="lpor",
    help="LPOR Reference Implementation — Layered Proof of Reserves",
    no_args_is_help=True,
)

console = Console()


@app.command()
def version() -> None:
    """Print the current LPOR version."""
    console.print(f"lpor {__version__}")


@app.command()
def generate(
    users: int = typer.Option(1000, "--users", "-n", help="Number of synthetic users"),
    output_dir: Path = typer.Option(
        Path("proofs"), "--output-dir", "-o", help="Output directory"
    ),
    proof_id: str = typer.Option(
        "", "--proof-id", help="Proof epoch ID (default: today's date YYYY-MM-DD)"
    ),
    seed: int = typer.Option(42, "--seed", "-s", help="Random seed"),
    asset: str = typer.Option("BTC", "--asset", help="Asset type"),
) -> None:
    """Generate a proof epoch from synthetic user data."""
    from lpor.core.generator import generate_users
    from lpor.core.ledger import PLLWriter
    from lpor.core.merkle import MerkleTree
    from lpor.core.tokenizer import tokenize_balance

    # Default proof_id to today
    if not proof_id:
        proof_id = date.today().isoformat()

    epoch_dir = output_dir / proof_id
    pll_path = epoch_dir / "pll.csv"
    tree_path = epoch_dir / "merkle_tree.bin"

    console.print(f"[bold]Generating proof epoch:[/bold] {proof_id}")
    console.print(f"  Users: {users:,}")
    console.print(f"  Seed: {seed}")
    console.print(f"  Output: {epoch_dir}")
    console.print()

    # Phase 1: Generate + tokenize + write PLL
    t_start = time.perf_counter()

    writer = PLLWriter(pll_path, proof_id=proof_id, asset=asset)
    for user in generate_users(users, seed=seed):
        tokens = tokenize_balance(user, proof_id)
        for token in tokens:
            writer.write_token(token)
    metadata = writer.finalize()

    t_pll = time.perf_counter()

    # Phase 2: Build Merkle tree
    use_mmap = users > 100_000
    tree = MerkleTree(output_path=tree_path if use_mmap else None, use_mmap=use_mmap)
    merkle_root = tree.build_from_pll(pll_path)
    tree.close()

    t_tree = time.perf_counter()

    # Write merkle root
    (epoch_dir / "merkle_root.txt").write_text(merkle_root)

    # Write metadata
    meta_dict = {
        "proof_id": proof_id,
        "epoch_date": proof_id,
        "asset": asset,
        "record_count": metadata.record_count,
        "total_sum": str(metadata.total_sum),
        "merkle_root": merkle_root,
        "user_count": users,
        "seed": seed,
        "pll_generation_time_s": round(t_pll - t_start, 3),
        "merkle_build_time_s": round(t_tree - t_pll, 3),
        "total_generation_time_s": round(t_tree - t_start, 3),
    }
    (epoch_dir / "metadata.json").write_text(json.dumps(meta_dict, indent=2))

    t_total = t_tree - t_start

    # Summary
    console.print("[green]✓ Proof epoch generated successfully[/green]")
    console.print()
    console.print(f"  PLL records:    {metadata.record_count:,}")
    console.print(f"  Total sum:      {metadata.total_sum} {asset}")
    console.print(f"  Merkle root:    {merkle_root[:16]}...")
    console.print(f"  PLL file size:  {pll_path.stat().st_size / 1_000_000:.2f} MB")
    console.print(f"  Generation time: {t_total:.2f}s")


@app.command(name="verify-user")
def verify_user(
    proof_dir: Path = typer.Option(..., "--proof-dir", "-p", help="Path to proof epoch"),
    user_id: str = typer.Option(..., "--user-id", "-u", help="User ID to verify"),
    balance: str = typer.Option(..., "--balance", "-b", help="Expected balance"),
) -> None:
    """Verify a user's token inclusion in the PLL (user-layer check)."""
    from lpor.verifier.user import verify_user_inclusion

    pll_path = proof_dir / "pll.csv"
    if not pll_path.exists():
        console.print(f"[red]Error:[/red] PLL file not found at {pll_path}")
        raise typer.Exit(1)

    # Read proof_id from metadata
    meta_path = proof_dir / "metadata.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        proof_id = meta["proof_id"]
    else:
        proof_id = proof_dir.name

    console.print(f"[bold]User verification:[/bold] {user_id}")
    console.print(f"  Proof epoch: {proof_id}")
    console.print(f"  Expected balance: {balance} BTC")
    console.print()

    result = verify_user_inclusion(
        pll_path=pll_path,
        user_id=user_id,
        balance=Decimal(balance),
        proof_id=proof_id,
        compute_total=True,
    )

    if result.all_included:
        console.print("[green]✓ All tokens found in PLL[/green]")
    else:
        console.print("[red]✗ Some tokens MISSING from PLL[/red]")

    console.print(f"  Tokens expected: {result.tokens_expected}")
    console.print(f"  Tokens found:    {result.tokens_found}")

    if result.missing_uuids:
        console.print(f"  Missing UUIDs:   {result.missing_uuids[:5]}")

    if result.total_liabilities is not None:
        console.print(f"  Total liabilities (all users): {result.total_liabilities} BTC")


@app.command(name="verify-auditor")
def verify_auditor_cmd(
    proof_dir: Path = typer.Option(..., "--proof-dir", "-p", help="Path to proof epoch"),
) -> None:
    """Recompute Merkle root from PLL and verify against published root (auditor check)."""
    from lpor.verifier.auditor import verify_auditor

    pll_path = proof_dir / "pll.csv"
    root_path = proof_dir / "merkle_root.txt"

    if not pll_path.exists():
        console.print(f"[red]Error:[/red] PLL file not found at {pll_path}")
        raise typer.Exit(1)
    if not root_path.exists():
        console.print(f"[red]Error:[/red] Merkle root not found at {root_path}")
        raise typer.Exit(1)

    published_root = root_path.read_text().strip()

    # Read proof_id
    meta_path = proof_dir / "metadata.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        proof_id = meta["proof_id"]
    else:
        proof_id = proof_dir.name

    console.print(f"[bold]Auditor verification:[/bold] {proof_id}")
    console.print(f"  Published root: {published_root[:16]}...")
    console.print()

    t_start = time.perf_counter()
    result = verify_auditor(pll_path, published_root=published_root, proof_id=proof_id)
    t_elapsed = time.perf_counter() - t_start

    if result.verification_passed:
        console.print("[green]✓ Verification PASSED[/green]")
    else:
        console.print("[red]✗ Verification FAILED[/red]")

    console.print(f"  Computed root:   {result.computed_root[:16]}...")
    console.print(f"  Roots match:     {result.roots_match}")
    console.print(f"  Records checked: {result.record_count:,}")
    console.print(f"  Total sum:       {result.total_sum} BTC")
    console.print(f"  Time:            {t_elapsed:.2f}s")


@app.command()
def stats(
    proof_dir: Path = typer.Option(..., "--proof-dir", "-p", help="Path to proof epoch"),
) -> None:
    """Show statistics for a proof epoch."""
    meta_path = proof_dir / "metadata.json"
    pll_path = proof_dir / "pll.csv"

    if not meta_path.exists():
        console.print(f"[red]Error:[/red] metadata.json not found at {proof_dir}")
        raise typer.Exit(1)

    meta = json.loads(meta_path.read_text())

    table = Table(title=f"Proof Epoch: {meta['proof_id']}")
    table.add_column("Metric", style="bold")
    table.add_column("Value")

    table.add_row("Proof ID", meta["proof_id"])
    table.add_row("Asset", meta.get("asset", "BTC"))
    table.add_row("User Count", f"{meta.get('user_count', 'N/A'):,}")
    table.add_row("PLL Records", f"{meta['record_count']:,}")
    table.add_row("Total Liabilities", f"{meta['total_sum']} BTC")
    table.add_row("Merkle Root", meta["merkle_root"][:32] + "...")

    if pll_path.exists():
        size_mb = pll_path.stat().st_size / 1_000_000
        table.add_row("PLL File Size", f"{size_mb:.2f} MB")

    tree_path = proof_dir / "merkle_tree.bin"
    if tree_path.exists():
        tree_mb = tree_path.stat().st_size / 1_000_000
        table.add_row("Merkle Tree Size", f"{tree_mb:.2f} MB")

    if "total_generation_time_s" in meta:
        table.add_row("Generation Time", f"{meta['total_generation_time_s']:.2f}s")

    console.print(table)


@app.command()
def detectability() -> None:
    """Show omission detectability analysis (reproduces Table IV)."""
    from lpor.core.detectability import format_table, generate_table_iv

    console.print("[bold]Omission Detectability Analysis[/bold]")
    console.print("Assumptions: N = 10,000,000 users, omission fraction = 0.001%")
    console.print("             k = 100 omitted users")
    console.print()

    results = generate_table_iv()
    console.print(format_table(results))

    console.print()
    console.print("[dim]P_detect = 1 - (1 - p)^k[/dim]")
    console.print(
        "[dim]LPOR increases p by simplifying verification → higher detection[/dim]"
    )


if __name__ == "__main__":
    app()
