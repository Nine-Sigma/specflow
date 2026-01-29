#!/bin/bash
# scripts/verify-spec.sh
# SpecFlow verification: pre-commit hooks + test framework detection
# Design: Simple, fast, delegates to existing tools
# Target: Complete in under 30 seconds

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== SpecFlow Verification ==="
echo ""

# Track overall status
FAILED=0

# Step 1: Run pre-commit hooks (security + formatting)
echo "1. Running pre-commit hooks..."
if pre-commit run --all-files; then
    echo -e "${GREEN}   [PASS] Pre-commit hooks passed${NC}"
else
    echo -e "${RED}   [FAIL] Pre-commit hooks failed${NC}"
    FAILED=1
fi
echo ""

# Step 2: Detect and run test framework
echo "2. Detecting test framework..."

run_tests() {
    # Check for Node.js project with test script
    if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
        echo "   Found: npm test script"
        if npm test; then
            echo -e "${GREEN}   [PASS] npm test passed${NC}"
        else
            echo -e "${RED}   [FAIL] npm test failed${NC}"
            return 1
        fi
    # Check for Python project with pytest
    elif [ -f "pytest.ini" ] || [ -f "pyproject.toml" ] || [ -f "conftest.py" ] || [ -d "tests" ]; then
        if command -v pytest &> /dev/null; then
            echo "   Found: pytest configuration"
            if pytest; then
                echo -e "${GREEN}   [PASS] pytest passed${NC}"
            else
                echo -e "${RED}   [FAIL] pytest failed${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}   [SKIP] pytest config found but pytest not installed${NC}"
        fi
    # Check for Go project
    elif [ -f "go.mod" ]; then
        echo "   Found: Go module"
        if go test ./...; then
            echo -e "${GREEN}   [PASS] go test passed${NC}"
        else
            echo -e "${RED}   [FAIL] go test failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}   [SKIP] No test framework detected (this is OK for spec-only repos)${NC}"
    fi
    return 0
}

if ! run_tests; then
    FAILED=1
fi
echo ""

# Summary
echo "=== Verification Summary ==="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed. Review output above.${NC}"
    exit 1
fi
