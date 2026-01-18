import { db } from "../db";
import { companies } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string;
    status: { name: string };
    priority: { name: string };
    issuetype: { name: string };
    assignee?: { displayName: string; emailAddress: string };
    reporter?: { displayName: string; emailAddress: string };
    created: string;
    updated: string;
    labels: string[];
  };
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
}

export class JiraIntegration {
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private companyId: string;

  constructor(config: { domain: string; email: string; apiToken: string; companyId: string }) {
    this.baseUrl = `https://${config.domain}.atlassian.net/rest/api/3`;
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.companyId = config.companyId;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString("base64")}`;
  }

  private async request<T>(endpoint: string, method = "GET", body?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Authorization": this.getAuthHeader(),
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Jira] API error ${response.status}: ${errorText}`);
      throw new Error(`Jira API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const data = await this.request<any>("/myself");
      console.log(`[Jira] Connected as: ${data.displayName}`);
      return { success: true, user: { displayName: data.displayName, email: data.emailAddress } };
    } catch (error: any) {
      console.error("[Jira] Connection test failed:", error.message);
      return { success: false, error: error.message };
    }
  }

  async fetchProjects(): Promise<JiraProject[]> {
    try {
      const data = await this.request<JiraProject[]>("/project");
      console.log(`[Jira] Fetched ${data.length} projects`);
      return data;
    } catch (error: any) {
      console.error("[Jira] Failed to fetch projects:", error.message);
      throw error;
    }
  }

  async fetchIssues(projectKey: string, maxResults = 50): Promise<JiraIssue[]> {
    try {
      const jql = encodeURIComponent(`project = ${projectKey} ORDER BY created DESC`);
      const data = await this.request<{ issues: JiraIssue[] }>(
        `/search?jql=${jql}&maxResults=${maxResults}`
      );
      console.log(`[Jira] Fetched ${data.issues.length} issues for project ${projectKey}`);
      return data.issues;
    } catch (error: any) {
      console.error("[Jira] Failed to fetch issues:", error.message);
      throw error;
    }
  }

  async createIssue(projectKey: string, summary: string, description: string, issueType = "Task"): Promise<JiraIssue> {
    try {
      const data = await this.request<JiraIssue>("/issue", "POST", {
        fields: {
          project: { key: projectKey },
          summary,
          description: {
            type: "doc",
            version: 1,
            content: [{
              type: "paragraph",
              content: [{ type: "text", text: description }]
            }]
          },
          issuetype: { name: issueType },
        },
      });
      console.log(`[Jira] Created issue: ${data.key}`);
      return data;
    } catch (error: any) {
      console.error("[Jira] Failed to create issue:", error.message);
      throw error;
    }
  }

  async updateIssue(issueKey: string, fields: Partial<{ summary: string; description: string }>): Promise<void> {
    try {
      const updateFields: any = {};
      if (fields.summary) updateFields.summary = fields.summary;
      if (fields.description) {
        updateFields.description = {
          type: "doc",
          version: 1,
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: fields.description }]
          }]
        };
      }

      await this.request(`/issue/${issueKey}`, "PUT", { fields: updateFields });
      console.log(`[Jira] Updated issue: ${issueKey}`);
    } catch (error: any) {
      console.error("[Jira] Failed to update issue:", error.message);
      throw error;
    }
  }
}

export async function getJiraIntegration(companyId: string): Promise<JiraIntegration | null> {
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company?.jiraDomain || !company?.jiraEmail || !company?.jiraApiToken) {
      return null;
    }

    return new JiraIntegration({
      domain: company.jiraDomain,
      email: company.jiraEmail,
      apiToken: company.jiraApiToken,
      companyId,
    });
  } catch (error) {
    console.error("[Jira] Failed to get integration:", error);
    return null;
  }
}
