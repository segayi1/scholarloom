#!/usr/bin/env python3
"""Download and install ScholarLoom's optional offline translation model."""

from pathlib import Path

from local_translation import LocalTranslator


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    translator = LocalTranslator(root / "data" / "translator", online=False)
    status = translator.install_offline()
    print(f"Offline translation model installed under {root / 'data' / 'translator'}")
    print(f"On-disk size: {status['diskBytes']} bytes")
