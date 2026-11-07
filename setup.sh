#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

python="${PYTHON:-python3}"
"$python" -c "import sys; assert sys.version_info >= (3, 12), 'Python 3.12 or newer is required'"
"$python" -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -c "import fitz, ctranslate2, sentencepiece; print('Dependencies ready.')"
echo "Setup complete. Run ./start.sh to start ScholarLoom."
