import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface MondayBoard {
  id: string;
  name: string;
  state: string;
  boardKind: string;
  columns: Array<{ id: string; title: string; type: string }>;
}

export interface MondayItem {
  id: string;
  name: string;
  state: string;
  boardId: string;
  groupId?: string;
  columnValues: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MondayGroup {
  id: string;
  title: string;
  color: string;
}

export class MondayIntegration {
  private apiKey: string;
  private companyId: string;
  private baseUrl = "https://api.monday.com/v2";

  constructor(apiKey: string, companyId: string) {
    this.apiKey = apiKey;
    this.companyId = companyId;
  }

  private async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await axios.post(this.baseUrl, {
      query,
      variables
    }, {
      headers: {
        "Authorization": this.apiKey,
        "Content-Type": "application/json"
      },
      timeout: 30000
    });
    
    if (response.data.errors) {
      throw new Error(response.data.errors[0]?.message || "GraphQL error");
    }
    
    return response.data.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; user?: string }> {
    try {
      const result = await this.graphql<{ me: { name: string; email: string } }>(`{ me { name email } }`);
      console.log(`[Monday] Connection test successful: ${result.me.name}`);
      return { success: true, message: "Monday.com connection verified", user: result.me.name };
    } catch (error: any) {
      console.error(`[Monday] Connection test failed:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async listBoards(): Promise<MondayBoard[]> {
    try {
      const result = await this.graphql<{ boards: any[] }>(`{
        boards(limit: 50) {
          id
          name
          state
          board_kind
          columns {
            id
            title
            type
          }
        }
      }`);

      const boards = result.boards.map(b => ({
        id: b.id,
        name: b.name,
        state: b.state,
        boardKind: b.board_kind,
        columns: b.columns
      }));

      console.log(`[Monday] Fetched ${boards.length} boards`);
      return boards;
    } catch (error: any) {
      console.error("[Monday] Failed to list boards:", error.message);
      throw error;
    }
  }

  async getBoardItems(boardId: string, limit: number = 100): Promise<MondayItem[]> {
    try {
      const result = await this.graphql<{ boards: Array<{ items_page: { items: any[] } }> }>(`
        query ($boardId: [ID!], $limit: Int!) {
          boards(ids: $boardId) {
            items_page(limit: $limit) {
              items {
                id
                name
                state
                group { id }
                column_values {
                  id
                  text
                  value
                }
                created_at
                updated_at
              }
            }
          }
        }
      `, { boardId: [boardId], limit });

      const items = result.boards[0]?.items_page?.items?.map(i => ({
        id: i.id,
        name: i.name,
        state: i.state,
        boardId,
        groupId: i.group?.id,
        columnValues: Object.fromEntries(i.column_values.map((cv: any) => [cv.id, cv.text || cv.value])),
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })) || [];

      console.log(`[Monday] Fetched ${items.length} items from board ${boardId}`);
      return items;
    } catch (error: any) {
      console.error("[Monday] Failed to get board items:", error.message);
      throw error;
    }
  }

  async createItem(boardId: string, itemName: string, columnValues?: Record<string, any>): Promise<MondayItem> {
    try {
      const result = await this.graphql<{ create_item: any }>(`
        mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
          create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
            id
            name
            state
            created_at
            updated_at
          }
        }
      `, {
        boardId,
        itemName,
        columnValues: columnValues ? JSON.stringify(columnValues) : null
      });

      console.log(`[Monday] Created item ${result.create_item.id}`);
      return {
        id: result.create_item.id,
        name: result.create_item.name,
        state: result.create_item.state,
        boardId,
        columnValues: columnValues || {},
        createdAt: result.create_item.created_at,
        updatedAt: result.create_item.updated_at
      };
    } catch (error: any) {
      console.error("[Monday] Failed to create item:", error.message);
      throw error;
    }
  }

  async updateItem(itemId: string, boardId: string, columnValues: Record<string, any>): Promise<MondayItem> {
    try {
      const result = await this.graphql<{ change_multiple_column_values: any }>(`
        mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
            id
            name
            state
            updated_at
          }
        }
      `, {
        boardId,
        itemId,
        columnValues: JSON.stringify(columnValues)
      });

      console.log(`[Monday] Updated item ${itemId}`);
      return {
        id: result.change_multiple_column_values.id,
        name: result.change_multiple_column_values.name,
        state: result.change_multiple_column_values.state,
        boardId,
        columnValues,
        createdAt: "",
        updatedAt: result.change_multiple_column_values.updated_at
      };
    } catch (error: any) {
      console.error("[Monday] Failed to update item:", error.message);
      throw error;
    }
  }

  async syncRFQsToBoard(boardId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const rfqs = await storage.getRfqs(this.companyId);
      
      for (const rfq of rfqs.slice(0, 50)) {
        try {
          await this.createItem(boardId, rfq.title, {
            status: { label: rfq.status },
            priority: { label: rfq.priority },
            date: { date: rfq.dueDate?.toISOString().split("T")[0] }
          });
          synced++;
        } catch (err: any) {
          errors.push(`RFQ ${rfq.title}: ${err.message}`);
        }
      }

      console.log(`[Monday] Synced ${synced} RFQs to board`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Monday] RFQ sync failed:", error.message);
      throw error;
    }
  }

  async syncSuppliersToBoard(boardId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const suppliers = await storage.getSuppliers(this.companyId);
      
      for (const supplier of suppliers) {
        try {
          await this.createItem(boardId, supplier.name, {
            email: { email: supplier.contactEmail, text: supplier.contactEmail }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Supplier ${supplier.name}: ${err.message}`);
        }
      }

      console.log(`[Monday] Synced ${synced} suppliers to board`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Monday] Supplier sync failed:", error.message);
      throw error;
    }
  }
}

export async function getMondayIntegration(companyId: string): Promise<MondayIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'monday');
    if (credentials?.apiKey) {
      console.log(`[Monday] Using centralized credential storage for company ${companyId}`);
      return new MondayIntegration(credentials.apiKey, companyId);
    }
  } catch (error) {
    console.log(`[Monday] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncMondayData(companyId: string): Promise<{
  success: boolean;
  boards?: number;
  items?: number;
  error?: string;
}> {
  const integration = await getMondayIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'Monday.com not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const boards = await integration.listBoards();
    let totalItems = 0;

    for (const board of boards.slice(0, 10)) {
      const items = await integration.getBoardItems(board.id, 50);
      totalItems += items.length;
    }

    console.log(`[Monday] Full sync complete: ${boards.length} boards, ${totalItems} items`);
    return {
      success: true,
      boards: boards.length,
      items: totalItems
    };
  } catch (error: any) {
    console.error('[Monday] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
