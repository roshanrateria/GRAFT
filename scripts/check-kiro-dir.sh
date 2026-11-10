#!/bin/bash
# Verify .kiro is tracked and not ignored

set -e

echo "Checking .kiro directory status..."

# Check if .kiro exists
if [ ! -d ".kiro" ]; then
  echo "ERROR: .kiro directory does not exist"
  exit 1
fi

# Check if .kiro is tracked by git
if ! git ls-files .kiro --error-unmatch > /dev/null 2>&1; then
  echo "ERROR: .kiro is not tracked by git"
  echo "Run: git add .kiro/"
  exit 1
fi

# Check if .kiro is in .gitignore
if git check-ignore -q .kiro 2>/dev/null; then
  echo "ERROR: .kiro is matched by .gitignore"
  echo "Remove .kiro from .gitignore"
  exit 1
fi

# Check if any .kiro files are ignored
IGNORED_FILES=$(git check-ignore .kiro/** 2>/dev/null || true)
if [ -n "$IGNORED_FILES" ]; then
  echo "ERROR: Some .kiro files are ignored by .gitignore:"
  echo "$IGNORED_FILES"
  exit 1
fi

echo "✓ .kiro is properly tracked"
exit 0
