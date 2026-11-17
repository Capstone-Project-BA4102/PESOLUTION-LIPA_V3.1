#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
python3 -m venv .venv-nlp
.venv-nlp/bin/python -m pip install torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu
.venv-nlp/bin/python -m pip install -r backend/requirements-nlp.txt
.venv-nlp/bin/python backend/skill_nlp.py --setup
