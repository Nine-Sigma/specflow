/**
 * Linear tracker utilities - GraphQL API wrapper
 * Requires LINEAR_API_KEY env var
 */
export function getApiKey(): string {
  return process.env.LINEAR_API_KEY || '';
}

interface LinearIssueResponse {
  data: {
    issueCreate: {
      issue: {
        id: string;
        identifier: string;
        title: string;
      };
    };
  };
}

export async function createIssue(
  title: string,
  description: string,
  teamId: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Linear not configured. Set LINEAR_API_KEY');
  if (!teamId) throw new Error('Linear team ID required');

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation CreateIssue($title: String!, $description: String, $teamId: String!) {
        issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
          issue { id identifier title }
        }
      }`,
      variables: { title, description, teamId },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json() as LinearIssueResponse;
  return data.data.issueCreate.issue.identifier;
}

export async function createProject(
  name: string,
  description: string,
  teamIds: string[]
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Linear not configured. Set LINEAR_API_KEY');

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `mutation CreateProject($name: String!, $description: String, $teamIds: [String!]!) {
        projectCreate(input: { name: $name, description: $description, teamIds: $teamIds }) {
          project { id name }
        }
      }`,
      variables: { name, description, teamIds },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Linear API error: ${response.status} - ${errorText}`);
  }
  const data = await response.json() as { data: { projectCreate: { project: { id: string } } } };
  return data.data.projectCreate.project.id;
}
