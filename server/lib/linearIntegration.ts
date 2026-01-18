import { db } from "../db";
import { companies } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company?.linearApiKey) {
      return null;
    }

    return new LinearIntegration({
      apiKey: company.linearApiKey,
      companyId,
    });
  } catch (error) {
    console.error("[Linear] Failed to get integration:", error);
    return null;
  }
}
