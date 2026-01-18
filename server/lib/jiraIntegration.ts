import { CredentialService } from "./credentialService";
import { storage } from "../storage";

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

  async syncIssuesAsDemandSignals(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const projects = await this.fetchProjects();
      
      for (const project of projects.slice(0, 5)) {
        try {
          const issues = await this.fetchIssues(project.key, 100);
          
          for (const issue of issues) {
            if (issue.fields.labels.includes('demand') || 
                issue.fields.labels.includes('procurement') ||
                issue.fields.issuetype.name === 'Story') {
              try {
                await storage.createDemandSignal({
                  companyId: this.companyId,
                  signalType: 'issue',
                  signalDate: new Date(issue.fields.created),
                  quantity: 1,
                  unit: 'units',
                  channel: 'jira',
                  customer: issue.fields.reporter?.displayName,
                  confidence: issue.fields.status.name === 'Done' ? 100 :
                              issue.fields.status.name === 'In Progress' ? 70 : 50,
                  priority: issue.fields.priority?.name || 'medium',
                  attributes: {
                    source: 'jira',
                    issueKey: issue.key,
                    issueSummary: issue.fields.summary,
                    issueType: issue.fields.issuetype.name,
                    projectKey: project.key
                  }
                });
                synced++;
              } catch (err: any) {
                errors.push(`Issue ${issue.key}: ${err.message}`);
              }
            }
          }
        } catch (err: any) {
          errors.push(`Project ${project.key}: ${err.message}`);
        }
      }

      console.log(`[Jira] Synced ${synced} demand signals`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Jira] Sync failed:", error.message);
      throw error;
    }
  }
}

export async function getJiraIntegration(companyId: string): Promise<JiraIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'jira');
    if (credentials?.domain && credentials?.username && credentials?.password) {
      console.log(`[Jira] Using centralized credential storage for company ${companyId}`);
      return new JiraIntegration({
        domain: credentials.domain,
        email: credentials.username,
        apiToken: credentials.password,
        companyId,
      });
    }
  } catch (error) {
    console.log(`[Jira] Credentials not available for company ${companyId}`);
  }
  
  return null;
}

export async function syncJiraData(companyId: string): Promise<{
  success: boolean;
  projects?: number;
  issues?: number;
  demandSignals?: number;
  error?: string;
}> {
  const integration = await getJiraIntegration(companyId);
  if (!integration) {
    return { success: false, error: "Jira not configured" };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.error };
    }

    const projects = await integration.fetchProjects();
    let totalIssues = 0;
    let demandSignals = 0;

    for (const project of projects.slice(0, 5)) {
      try {
        const issues = await integration.fetchIssues(project.key, 100);
        totalIssues += issues.length;

        for (const issue of issues) {
          if (issue.fields.labels.includes('demand') || 
              issue.fields.labels.includes('procurement') ||
              issue.fields.issuetype.name === 'Story') {
            try {
              await storage.createDemandSignal({
                companyId,
                signalType: 'issue',
                signalDate: new Date(issue.fields.created),
                quantity: 1,
                unit: 'units',
                channel: 'jira',
                customer: issue.fields.reporter?.displayName,
                confidence: issue.fields.status.name === 'Done' ? 100 :
                            issue.fields.status.name === 'In Progress' ? 70 : 50,
                priority: issue.fields.priority?.name || 'medium',
                attributes: {
                  source: 'jira',
                  issueKey: issue.key,
                  issueSummary: issue.fields.summary,
                  issueType: issue.fields.issuetype.name,
                  labels: issue.fields.labels
                }
              });
              demandSignals++;
            } catch (err) {
              console.error(`[Jira] Failed to create demand signal for issue ${issue.key}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`[Jira] Failed to fetch issues for project ${project.key}:`, err);
      }
    }

    console.log(`[Jira] Synced ${projects.length} projects, ${totalIssues} issues, ${demandSignals} demand signals`);
    return {
      success: true,
      projects: projects.length,
      issues: totalIssues,
      demandSignals
    };
  } catch (error: any) {
    console.error("[Jira] Sync failed:", error.message);
    return { success: false, error: error.message };
  }
}
