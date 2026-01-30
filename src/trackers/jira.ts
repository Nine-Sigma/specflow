/**
 * Jira tracker utilities - REST API wrapper
 * Requires JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN env vars
 */
export interface JiraConfig {
  url: string;
  email: string;
  token: string;
  project: string;
}

export function getConfig(): JiraConfig {
  return {
    url: process.env.JIRA_URL || '',
    email: process.env.JIRA_EMAIL || '',
    token: process.env.JIRA_API_TOKEN || '',
    project: process.env.JIRA_PROJECT || '',
  };
}

export async function createIssue(
  summary: string,
  description: string,
  issueType: 'Epic' | 'Story' | 'Task' = 'Story'
): Promise<string> {
  const config = getConfig();
  if (!config.url || !config.token) {
    throw new Error('Jira not configured. Set JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN');
  }

  const response = await fetch(`${config.url}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: config.project },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: description }]
          }]
        },
        issuetype: { name: issueType },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jira API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json() as { key: string };
  return data.key;
}

export async function createEpic(summary: string, description: string): Promise<string> {
  return createIssue(summary, description, 'Epic');
}

export async function createStory(summary: string, description: string): Promise<string> {
  return createIssue(summary, description, 'Story');
}
