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
        # Detect package manager by lockfile (first match wins)
        if [ -f "bun.lockb" ]; then
            echo "   Found: bun project (bun.lockb)"
            if command -v bun &> /dev/null; then
                if bun test; then
                    echo -e "${GREEN}   [PASS] bun test passed${NC}"
                else
                    echo -e "${RED}   [FAIL] bun test failed${NC}"
                    return 1
                fi
            else
                echo -e "${YELLOW}   [SKIP] bun.lockb found but bun not installed${NC}"
            fi
        elif [ -f "pnpm-lock.yaml" ]; then
            echo "   Found: pnpm project (pnpm-lock.yaml)"
            if command -v pnpm &> /dev/null; then
                if pnpm test; then
                    echo -e "${GREEN}   [PASS] pnpm test passed${NC}"
                else
                    echo -e "${RED}   [FAIL] pnpm test failed${NC}"
                    return 1
                fi
            else
                echo -e "${YELLOW}   [SKIP] pnpm-lock.yaml found but pnpm not installed${NC}"
            fi
        elif [ -f "yarn.lock" ]; then
            echo "   Found: yarn project (yarn.lock)"
            if command -v yarn &> /dev/null; then
                if yarn test; then
                    echo -e "${GREEN}   [PASS] yarn test passed${NC}"
                else
                    echo -e "${RED}   [FAIL] yarn test failed${NC}"
                    return 1
                fi
            else
                echo -e "${YELLOW}   [SKIP] yarn.lock found but yarn not installed${NC}"
            fi
        else
            # package-lock.json or no lockfile -> use npm
            echo "   Found: npm project"
            if command -v npm &> /dev/null; then
                if npm test; then
                    echo -e "${GREEN}   [PASS] npm test passed${NC}"
                else
                    echo -e "${RED}   [FAIL] npm test failed${NC}"
                    return 1
                fi
            else
                echo -e "${YELLOW}   [SKIP] package.json found but npm not installed${NC}"
            fi
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
        if command -v go &> /dev/null; then
            if go test ./...; then
                echo -e "${GREEN}   [PASS] go test passed${NC}"
            else
                echo -e "${RED}   [FAIL] go test failed${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}   [SKIP] go.mod found but go not installed${NC}"
        fi
    # Check for Rust project
    elif [ -f "Cargo.toml" ]; then
        echo "   Found: Rust project (Cargo.toml)"
        if command -v cargo &> /dev/null; then
            if cargo test; then
                echo -e "${GREEN}   [PASS] cargo test passed${NC}"
            else
                echo -e "${RED}   [FAIL] cargo test failed${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}   [SKIP] Cargo.toml found but cargo not installed${NC}"
        fi
    # Check for Java Maven project
    elif [ -f "pom.xml" ]; then
        echo "   Found: Java Maven project (pom.xml)"
        if command -v mvn &> /dev/null; then
            if mvn test -q; then
                echo -e "${GREEN}   [PASS] mvn test passed${NC}"
            else
                echo -e "${RED}   [FAIL] mvn test failed${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}   [SKIP] pom.xml found but mvn not installed${NC}"
        fi
    # Check for Java Gradle project
    elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
        echo "   Found: Java Gradle project"
        if [ -f "./gradlew" ]; then
            echo "   Using Gradle wrapper"
            if ./gradlew test; then
                echo -e "${GREEN}   [PASS] gradlew test passed${NC}"
            else
                echo -e "${RED}   [FAIL] gradlew test failed${NC}"
                return 1
            fi
        elif command -v gradle &> /dev/null; then
            if gradle test; then
                echo -e "${GREEN}   [PASS] gradle test passed${NC}"
            else
                echo -e "${RED}   [FAIL] gradle test failed${NC}"
                return 1
            fi
        else
            echo -e "${YELLOW}   [SKIP] build.gradle found but gradle not installed and no wrapper${NC}"
        fi
    # Check for Ruby project
    elif [ -f "Gemfile" ]; then
        echo "   Found: Ruby project (Gemfile)"
        if command -v bundle &> /dev/null; then
            if [ -d "spec" ]; then
                echo "   Using RSpec (spec/ directory found)"
                if bundle exec rspec; then
                    echo -e "${GREEN}   [PASS] bundle exec rspec passed${NC}"
                else
                    echo -e "${RED}   [FAIL] bundle exec rspec failed${NC}"
                    return 1
                fi
            else
                echo "   Using Rake test"
                if bundle exec rake test; then
                    echo -e "${GREEN}   [PASS] bundle exec rake test passed${NC}"
                else
                    echo -e "${RED}   [FAIL] bundle exec rake test failed${NC}"
                    return 1
                fi
            fi
        else
            echo -e "${YELLOW}   [SKIP] Gemfile found but bundle not installed${NC}"
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
