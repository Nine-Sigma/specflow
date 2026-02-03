# Browser Mode UAT

Execute UI Gherkin scenarios using browser-use CLI for AI-powered browser automation.

## When to Use

- Testing UI components (forms, buttons, navigation)
- Visual verification (elements visible, styling correct)
- User flow testing (login, checkout, onboarding)
- Interactive behavior (modals, dropdowns, drag-and-drop)
- Scenarios with "I click", "I see", "I am on page" patterns

## Tool: browser-use

[browser-use](https://github.com/browser-use/browser-use) provides AI-powered browser automation via natural language.

### Installation Check

```bash
# Check if browser-use is installed
which browser-use || pip show browser-use
```

### Lazy Install Prompt

If browser-use not installed:

```markdown
browser-use is required for UI UAT but not installed.

Options:
1. Install browser-use: `pip install browser-use`
2. Skip browser UAT and use manual checklist
3. Cancel

Would you like to install? (install/skip/cancel)
```

Store preference in `.specflow/config.json`:
```json
{
  "uat": {
    "browser_use_prompted": true,
    "browser_use_installed": true
  }
}
```

### Basic Usage

```bash
# Single task execution
browser-use "Go to http://localhost:3000/login, fill email with test@example.com, fill password with password123, click Login button"

# With screenshot evidence
browser-use "Go to http://localhost:3000/dashboard, verify I see Welcome, take screenshot" --save-screenshot evidence/dashboard.png
```

## Execution Flow

### Step 1: Start Server (if not running)

```bash
# Detect if server already running
curl -s http://localhost:3000/health && echo "Server running" || npm run dev &
```

### Step 2: Parse Gherkin Steps

Convert Gherkin scenario to browser-use task list:

```gherkin
Scenario: User logs in successfully
  Given I am on the login page
  When I fill in "email" with "test@example.com"
  And I fill in "password" with "password123"
  And I click "Login"
  Then I should see "Welcome to Dashboard"
```

Becomes:
```bash
browser-use "Navigate to http://localhost:3000/login"
browser-use "Fill the email field with test@example.com"
browser-use "Fill the password field with password123"
browser-use "Click the Login button"
browser-use "Verify text 'Welcome to Dashboard' is visible on the page"
```

### Step 3: Execute with Evidence Capture

```bash
# Execute each step, capture evidence
SCENARIO="user-login"
mkdir -p .specflow/features/${FEATURE}/evidence/${SCENARIO}

browser-use "Navigate to http://localhost:3000/login" \
  --save-screenshot ".specflow/features/${FEATURE}/evidence/${SCENARIO}/01-login-page.png"

browser-use "Fill email with test@example.com, fill password with password123" \
  --save-screenshot ".specflow/features/${FEATURE}/evidence/${SCENARIO}/02-form-filled.png"

browser-use "Click Login button" \
  --save-screenshot ".specflow/features/${FEATURE}/evidence/${SCENARIO}/03-after-click.png"

browser-use "Verify 'Welcome to Dashboard' text is visible" \
  --save-screenshot ".specflow/features/${FEATURE}/evidence/${SCENARIO}/04-final-state.png"
```

### Step 4: Collect Results

Parse browser-use output for pass/fail:

```bash
# Success indicators
"Task completed successfully"
"Text found"
"Element visible"

# Failure indicators
"Element not found"
"Text not visible"
"Navigation failed"
"Timeout"
```

## Headless Mode for CI

```bash
# Run headless (no visible browser)
browser-use --headless "Navigate to http://localhost:3000 and verify page loads"
```

## Evidence Capture

### Screenshots

Capture at key verification points:
- After navigation
- After form submission
- After state change
- On failure

### Output Format

```json
{
  "scenario": "User logs in successfully",
  "mode": "browser",
  "steps": [
    {
      "gherkin": "Given I am on the login page",
      "action": "Navigate to http://localhost:3000/login",
      "status": "pass",
      "evidence": "evidence/user-login/01-login-page.png"
    },
    {
      "gherkin": "Then I should see 'Welcome to Dashboard'",
      "action": "Verify text visible",
      "status": "fail",
      "error": "Text 'Welcome to Dashboard' not found. Found: 'Invalid credentials'",
      "evidence": "evidence/user-login/04-final-state.png"
    }
  ],
  "overall": "fail"
}
```

## Limitations

- Requires Python and pip for browser-use installation
- First run downloads browser (~150MB)
- Visual verification is approximate (AI-based)
- Complex interactions may need multiple steps
- Rate limits on AI providers (if using cloud-based browser-use)
