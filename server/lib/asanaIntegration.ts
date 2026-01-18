import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface AsanaWorkspace {
  gid: string;
  name: string;
}

export interface AsanaProject {
  gid: string;
  name: string;
  workspaceGid: string;
  color?: string;
  archived: boolean;
  createdAt: string;
}

export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  dueOn?: string;
  assignee?: { gid: string; name: string };
  projectGid?: string;
  createdAt: string;
  modifiedAt: string;
}

export class AsanaIntegration {
  private accessToken: string;
  private companyId: string;
  private baseUrl = "https://app.asana.com/api/1.0";

  constructor(accessToken: string, companyId: string) {
    this.accessToken = accessToken;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json"
      },
      data,
      timeout: 30000
    });
    
    return response.data.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; user?: string }> {
    try {
      const user = await this.request<{ name: string; email: string }>("/users/me");
      console.log(`[Asana] Connection test successful: ${user.name}`);
      return { success: true, message: "Asana connection verified", user: user.name };
    } catch (error: any) {
      console.error(`[Asana] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.errors?.[0]?.message || error.message };
    }
  }

  async listWorkspaces(): Promise<AsanaWorkspace[]> {
    try {
      const workspaces = await this.request<any[]>("/workspaces");
      console.log(`[Asana] Fetched ${workspaces.length} workspaces`);
      return workspaces.map(w => ({ gid: w.gid, name: w.name }));
    } catch (error: any) {
      console.error("[Asana] Failed to list workspaces:", error.message);
      throw error;
    }
  }

  async listProjects(workspaceGid: string): Promise<AsanaProject[]> {
    try {
      const projects = await this.request<any[]>(`/workspaces/${workspaceGid}/projects?opt_fields=name,color,archived,created_at`);
      console.log(`[Asana] Fetched ${projects.length} projects`);
      return projects.map(p => ({
        gid: p.gid,
        name: p.name,
        workspaceGid,
        color: p.color,
        archived: p.archived,
        createdAt: p.created_at
      }));
    } catch (error: any) {
      console.error("[Asana] Failed to list projects:", error.message);
      throw error;
    }
  }

  async getProjectTasks(projectGid: string): Promise<AsanaTask[]> {
    try {
      const tasks = await this.request<any[]>(`/projects/${projectGid}/tasks?opt_fields=name,notes,completed,due_on,assignee.name,created_at,modified_at`);
      console.log(`[Asana] Fetched ${tasks.length} tasks from project ${projectGid}`);
      return tasks.map(t => ({
        gid: t.gid,
        name: t.name,
        notes: t.notes,
        completed: t.completed,
        dueOn: t.due_on,
        assignee: t.assignee ? { gid: t.assignee.gid, name: t.assignee.name } : undefined,
        projectGid,
        createdAt: t.created_at,
        modifiedAt: t.modified_at
      }));
    } catch (error: any) {
      console.error("[Asana] Failed to get project tasks:", error.message);
      throw error;
    }
  }

  async createTask(projectGid: string, name: string, notes?: string, dueOn?: string): Promise<AsanaTask> {
    try {
      const task = await this.request<any>("/tasks", "POST", {
        data: {
          name,
          notes,
          due_on: dueOn,
          projects: [projectGid]
        }
      });

      console.log(`[Asana] Created task ${task.gid}`);
      return {
        gid: task.gid,
        name: task.name,
        notes: task.notes,
        completed: task.completed,
        dueOn: task.due_on,
        projectGid,
        createdAt: task.created_at,
        modifiedAt: task.modified_at
      };
    } catch (error: any) {
      console.error("[Asana] Failed to create task:", error.message);
      throw error;
    }
  }

  async updateTask(taskGid: string, updates: { name?: string; notes?: string; completed?: boolean; dueOn?: string }): Promise<AsanaTask> {
    try {
      const data: any = {};
      if (updates.name) data.name = updates.name;
      if (updates.notes !== undefined) data.notes = updates.notes;
      if (updates.completed !== undefined) data.completed = updates.completed;
      if (updates.dueOn !== undefined) data.due_on = updates.dueOn;

      const task = await this.request<any>(`/tasks/${taskGid}`, "PUT", { data });

      console.log(`[Asana] Updated task ${taskGid}`);
      return {
        gid: task.gid,
        name: task.name,
        notes: task.notes,
        completed: task.completed,
        dueOn: task.due_on,
        createdAt: task.created_at,
        modifiedAt: task.modified_at
      };
    } catch (error: any) {
      console.error("[Asana] Failed to update task:", error.message);
      throw error;
    }
  }

  async syncRFQsToProject(projectGid: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const rfqs = await storage.getRfqs(this.companyId);
      
      for (const rfq of rfqs.slice(0, 50)) {
        try {
          await this.createTask(
            projectGid,
            `RFQ: ${rfq.title}`,
            `Status: ${rfq.status}\nPriority: ${rfq.priority}\n\n${rfq.description || ""}`,
            rfq.dueDate?.toISOString().split("T")[0]
          );
          synced++;
        } catch (err: any) {
          errors.push(`RFQ ${rfq.title}: ${err.message}`);
        }
      }

      console.log(`[Asana] Synced ${synced} RFQs to project`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Asana] RFQ sync failed:", error.message);
      throw error;
    }
  }

  async importTasksAsDemandSignals(projectGid: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const tasks = await this.getProjectTasks(projectGid);
      
      for (const task of tasks.filter(t => !t.completed)) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "task",
            signalDate: new Date(task.createdAt),
            quantity: 1,
            unit: "units",
            channel: "asana",
            customer: task.assignee?.name,
            confidence: task.dueOn ? 70 : 50,
            priority: "medium",
            attributes: {
              source: "asana",
              taskId: task.gid,
              taskName: task.name,
              dueOn: task.dueOn
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Task ${task.name}: ${err.message}`);
        }
      }

      console.log(`[Asana] Created ${synced} demand signals from tasks`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Asana] Task import failed:", error.message);
      throw error;
    }
  }
}

export async function getAsanaIntegration(companyId: string): Promise<AsanaIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'asana');
    if (credentials?.accessToken) {
      console.log(`[Asana] Using centralized credential storage for company ${companyId}`);
      return new AsanaIntegration(credentials.accessToken, companyId);
    }
  } catch (error) {
    console.log(`[Asana] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncAsanaData(companyId: string): Promise<{
  success: boolean;
  workspaces?: number;
  projects?: number;
  tasks?: number;
  error?: string;
}> {
  const integration = await getAsanaIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'Asana not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const workspaces = await integration.listWorkspaces();
    let totalProjects = 0;
    let totalTasks = 0;

    for (const workspace of workspaces) {
      const projects = await integration.listProjects(workspace.gid);
      totalProjects += projects.length;

      for (const project of projects.slice(0, 5)) {
        const tasks = await integration.getProjectTasks(project.gid);
        totalTasks += tasks.length;
      }
    }

    console.log(`[Asana] Full sync complete: ${workspaces.length} workspaces, ${totalProjects} projects, ${totalTasks} tasks`);
    return {
      success: true,
      workspaces: workspaces.length,
      projects: totalProjects,
      tasks: totalTasks
    };
  } catch (error: any) {
    console.error('[Asana] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
