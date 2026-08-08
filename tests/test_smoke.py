"""Smoke tests to verify the package is importable and version is set."""


def test_import_lpor() -> None:
    import lpor

    assert lpor.__version__ == "0.1.0"


def test_import_subpackages() -> None:
    import lpor.core  # noqa: F401
    import lpor.models  # noqa: F401
    import lpor.verifier  # noqa: F401
