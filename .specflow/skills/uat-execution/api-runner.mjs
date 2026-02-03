#!/usr/bin/env node

/**
 * API Runner for UAT Execution Skill
 *
 * Usage:
 *   API_URL="http://localhost:3000" node api-runner.mjs GET /api/health
 *   API_URL="http://localhost:3000" HEADERS='{"Authorization":"Bearer token"}' node api-runner.mjs GET /api/protected
 *   API_URL="http://localhost:3000" BODY='{"email":"test@example.com"}' node api-runner.mjs POST /api/login
 *
 * Environment Variables:
 *   API_URL  - Base URL for the API (required)
 *   HEADERS  - JSON string of headers (optional)
 *   BODY     - JSON string of request body (optional)
 *
 * Arguments:
 *   METHOD   - HTTP method (GET, POST, PUT, DELETE, PATCH)
 *   ENDPOINT - API endpoint path (e.g., /api/users)
 *
 * Output:
 *   JSON object with status, statusText, headers, body, duration_ms
 */

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: API_URL=<url> [HEADERS=<json>] [BODY=<json>] node api-runner.mjs <METHOD> <ENDPOINT>');
  console.error('Example: API_URL="http://localhost:3000" node api-runner.mjs GET /api/health');
  process.exit(1);
}

const method = args[0].toUpperCase();
const endpoint = args[1];

const baseUrl = process.env.API_URL;
if (!baseUrl) {
  console.error('Error: API_URL environment variable is required');
  process.exit(1);
}

// Parse optional headers from environment variable
let headers = {};
if (process.env.HEADERS) {
  try {
    headers = JSON.parse(process.env.HEADERS);
  } catch (e) {
    console.error('Error: HEADERS must be valid JSON');
    process.exit(1);
  }
}

// Parse optional body from environment variable
let body = undefined;
if (process.env.BODY) {
  try {
    body = JSON.parse(process.env.BODY);
    // Set Content-Type if not already set and body is provided
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  } catch (e) {
    // Body might be plain text
    body = process.env.BODY;
  }
}

async function run() {
  const url = `${baseUrl}${endpoint}`;
  const startTime = Date.now();

  try {
    const fetchOptions = {
      method,
      headers,
    };

    // Add body for methods that support it
    if (body !== undefined && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const duration_ms = Date.now() - startTime;

    // Parse response headers
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Parse response body based on content type
    let responseBody;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch (e) {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    const result = {
      method,
      endpoint,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      duration_ms,
    };

    console.log(JSON.stringify(result, null, 2));

    // Exit with error code if status indicates failure
    if (response.status >= 400) {
      process.exit(1);
    }
  } catch (error) {
    const duration_ms = Date.now() - startTime;

    const result = {
      method,
      endpoint,
      error: error.message,
      duration_ms,
    };

    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

run();
