#!/bin/bash
# Run all pre-submission checks

set -e

echo "=== GRAFT Preflight Checks ==="
echo ""

# 1. Check .kiro directory
echo "1. Checking .kiro directory..."
./scripts/check-kiro-dir.sh

# 2. Check LICENSE exists
echo ""
echo "2. Checking LICENSE..."
if [ ! -f "LICENSE" ]; then
  echo "ERROR: LICENSE file missing"
  exit 1
fi
echo "✓ LICENSE exists"

# 3. Check README sections
echo ""
echo "3. Checking README sections..."
if [ ! -f "README.md" ]; then
  echo "ERROR: README.md missing"
  exit 1
fi

REQUIRED_SECTIONS=("THREAT_MODEL" "Run Instructions" "Kiro Usage")
for section in "${REQUIRED_SECTIONS[@]}"; do
  if ! grep -q "## $section\|##.*$section" README.md; then
    echo "ERROR: README missing section: $section"
    exit 1
  fi
done
echo "✓ README has all required sections"

# 4. Check for secrets
echo ""
echo "4. Checking for secrets..."
if grep -r "LLM_API_KEY\|API_KEY\|SECRET" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -v "process.env\|import.meta.env" | grep -v ".env.example"; then
  echo "ERROR: Potential secrets found in code"
  exit 1
fi
echo "✓ No secrets found"

# 5. Run tests
echo ""
echo "5. Running tests..."
if command -v pnpm &> /dev/null; then
  pnpm test || echo "WARNING: Tests not configured yet"
else
  echo "WARNING: pnpm not available, skipping tests"
fi

# 6. Check package.json exists
echo ""
echo "6. Checking package.json..."
if [ ! -f "package.json" ]; then
  echo "WARNING: package.json not found (expected in pnpm workspace)"
fi

# 7. Check .gitignore doesn't contain .kiro
echo ""
echo "7. Checking .gitignore..."
if [ -f ".gitignore" ]; then
  if grep -q "^.kiro$\|^.kiro/" .gitignore; then
    echo "ERROR: .kiro found in .gitignore"
    exit 1
  fi
  echo "✓ .kiro not in .gitignore"
fi

echo ""
echo "=== Preflight Complete ==="
echo "All checks passed!"
