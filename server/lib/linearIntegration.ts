import { CredentialService } from "./credentialService";
import { storage } from "../storage";

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: { name: string };
  priority: number;
  priorityLabel: string;
  assignee?: { name: string; email: string };
  creator?: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
  labels: { nodes: Array<{ name: string }> };
}

export interface LinearTeam {
  id: string;
  key: string;
  name: string;
}

export class LinearIntegration {
  private apiKey: string;
  private companyId: string;
  private baseUrl = "https://api.linear.app/graphql";

  constructor(config: { apiKey: string; companyId: string }) {
    this.apiKey = config.apiKey;
    this.companyId = config.companyId;
  }

  private async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": this.apiKey,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Linear] API error ${response.status}: ${errorText}`);
      throw new Error(`Linear API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    if (result.errors) {
      console.error("[Linear] GraphQL errors:", result.errors);
      throw new Error(`Linear GraphQL error: ${result.errors[0].message}`);
    }

    return result.data;
  }

  async testConnection(): Promise<{ success: boolean; viewer?: any; error?: string }> {
    try {
      const data = await this.graphql<{ viewer: { id: string; name: string; email: string } }>(`
        query {
          viewer {
            id
            name
            email
          }
        }
      `);
      console.log(`[Linear] Connected as: ${data.viewer.name}`);
      return { success: true, viewer: data.viewer };
    } catch (error: any) {
      console.error("[Linear] Connection test failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  async fetchTeams(): Promise<LinearTeam[]> {
    try {
      const data = await this.graphql<{ teams: { nodes: LinearTeam[] } }>(`
        query {
          teams {
            nodes {
              id
              key
              name
            }
          }
        }
      `);
      console.log(`[Linear] Fetched ${data.teams.nodes.length} teams`);
      return data.teams.nodes;
    } catch (error: any) {
      console.error("[Linear] Failed to fetch teams:", error.message);
      throw error;
    }
  }

  async fetchIssues(teamId?: string, first = 50): Promise<LinearIssue[]> {
    try {
      const filter = teamId ? `filter: { team: { id: { eq: "${teamId}" } } }` : "";
      const data = await this.graphql<{ issues: { nodes: LinearIssue[] } }>(`
        query {
          issues(first: ${first} ${filter} orderBy: createdAt) {
            nodes {
              id
              identifier
              title
              description
              state { name }
              priority
              priorityLabel
              assignee { name email }
              creator { name email }
              createdAt
              updatedAt
              labels { nodes { name } }
            }
          }
        }
      `);
      console.log(`[Linear] Fetched ${data.issues.nodes.length} issues`);
      return data.issues.nodes;
    } catch (error: any) {
      console.error("[Linear] Failed to fetch issues:", error.message);
      throw error;
    }
  }

  async createIssue(teamId: string, title: string, description?: string, priority?: number): Promise<{ id: string; identifier: string }> {
    try {
      const data = await this.graphql<{ issueCreate: { success: boolean; issue: { id: string; identifier: string } } }>(`
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue {
              id
              identifier
            }
          }
        }
      `, {
        input: {
          teamId,
          title,
          description,
          priority,
        },
      });
      
      if (!data.issueCreate.success) {
        throw new Error("Issue creation failed");
      }
      
      console.log(`[Linear] Created issue: ${data.issueCreate.issue.identifier}`);
      return data.issueCreate.issue;
    } catch (error: any) {
      console.error("[Linear] Failed to create issue:", error.message);
      throw error;
    }
  }

  async updateIssue(issueId: string, updates: { title?: string; description?: string; priority?: number }): Promise<void> {
    try {
      await this.graphql(`
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
          }
        }
      `, {
        id: issueId,
        input: updates,
      });
      console.log(`[Linear] Updated issue: ${issueId}`);
    } catch (error: any) {
      console.error("[Linear] Failed to update issue:", error.message);
      throw error;
    }
  }
}

export async function getLinearIntegration(companyId: string): Promise<LinearIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'linear');
    if (credentials?.apiKey) {
      console.log(`[Linear] Using centralized credential storage for company ${companyId}`);
      return new LinearIntegration({
        apiKey: credentials.apiKey,
        companyId,
      });
    }
  } catch (error) {
    console.log(`[Linear] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncLinearData(companyId: string): Promise<{
  success: boolean;
  teams?: number;
  issues?: number;
  demandSignals?: number;
  error?: string;
}> {
  const integration = await getLinearIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'Linear not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.error };
    }

    const teams = await integration.fetchTeams();
    let totalIssues = 0;
    let demandSignals = 0;

    for (const team of teams) {
      const issues = await integration.fetchIssues(team.id, 50);
      totalIssues += issues.length;

      for (const issue of issues) {
        const labels = issue.labels.nodes.map(l => l.name);
        if (labels.includes('demand') || labels.includes('procurement') || issue.priority <= 2) {
          try {
            await storage.createDemandSignal({
              companyId,
              signalType: 'issue',
              signalDate: new Date(issue.createdAt),
              quantity: 1,
              unit: 'units',
              channel: 'linear',
              customer: issue.creator?.name,
              confidence: issue.state.name === 'Done' ? 100 : issue.state.name === 'In Progress' ? 70 : 50,
              priority: issue.priorityLabel || 'medium',
              attributes: {
                source: 'linear',
                issueId: issue.id,
                issueIdentifier: issue.identifier,
                issueTitle: issue.title,
                teamName: team.name,
                labels
              }
            });
            demandSignals++;
          } catch (err) {
            console.error(`[Linear] Failed to create demand signal for issue ${issue.identifier}:`, err);
          }
        }
      }
    }

    console.log(`[Linear] Full sync complete: ${teams.length} teams, ${totalIssues} issues, ${demandSignals} demand signals`);
    return {
      success: true,
      teams: teams.length,
      issues: totalIssues,
      demandSignals
    };
  } catch (error: any) {
    console.error('[Linear] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
