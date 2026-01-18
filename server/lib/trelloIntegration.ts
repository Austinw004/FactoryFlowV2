import axios from "axios";
import { storage } from "../storage";
import { CredentialService } from "./credentialService";

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  url: string;
}

export interface TrelloList {
  id: string;
  name: string;
  boardId: string;
  closed: boolean;
  pos: number;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  listId: string;
  boardId: string;
  due?: string;
  closed: boolean;
  labels: Array<{ id: string; name: string; color: string }>;
  url: string;
}

export class TrelloIntegration {
  private apiKey: string;
  private token: string;
  private companyId: string;
  private baseUrl = "https://api.trello.com/1";

  constructor(apiKey: string, token: string, companyId: string) {
    this.apiKey = apiKey;
    this.token = token;
    this.companyId = companyId;
  }

  private async request<T>(endpoint: string, method: string = "GET", data?: any): Promise<T> {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `${this.baseUrl}${endpoint}${separator}key=${this.apiKey}&token=${this.token}`;
    
    const response = await axios({
      method,
      url,
      data,
      timeout: 30000
    });
    
    return response.data;
  }

  async testConnection(): Promise<{ success: boolean; message?: string; user?: string }> {
    try {
      const member = await this.request<{ fullName: string; username: string }>("/members/me");
      console.log(`[Trello] Connection test successful: ${member.fullName}`);
      return { success: true, message: "Trello connection verified", user: member.fullName };
    } catch (error: any) {
      console.error(`[Trello] Connection test failed:`, error.message);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  async listBoards(): Promise<TrelloBoard[]> {
    try {
      const boards = await this.request<any[]>("/members/me/boards?filter=open");
      console.log(`[Trello] Fetched ${boards.length} boards`);
      return boards.map(b => ({
        id: b.id,
        name: b.name,
        desc: b.desc,
        closed: b.closed,
        url: b.url
      }));
    } catch (error: any) {
      console.error("[Trello] Failed to list boards:", error.message);
      throw error;
    }
  }

  async getBoardLists(boardId: string): Promise<TrelloList[]> {
    try {
      const lists = await this.request<any[]>(`/boards/${boardId}/lists`);
      console.log(`[Trello] Fetched ${lists.length} lists from board ${boardId}`);
      return lists.map(l => ({
        id: l.id,
        name: l.name,
        boardId,
        closed: l.closed,
        pos: l.pos
      }));
    } catch (error: any) {
      console.error("[Trello] Failed to get board lists:", error.message);
      throw error;
    }
  }

  async getListCards(listId: string): Promise<TrelloCard[]> {
    try {
      const cards = await this.request<any[]>(`/lists/${listId}/cards`);
      console.log(`[Trello] Fetched ${cards.length} cards from list ${listId}`);
      return cards.map(c => ({
        id: c.id,
        name: c.name,
        desc: c.desc,
        listId,
        boardId: c.idBoard,
        due: c.due,
        closed: c.closed,
        labels: c.labels.map((l: any) => ({ id: l.id, name: l.name, color: l.color })),
        url: c.url
      }));
    } catch (error: any) {
      console.error("[Trello] Failed to get list cards:", error.message);
      throw error;
    }
  }

  async createCard(listId: string, name: string, desc?: string, due?: string): Promise<TrelloCard> {
    try {
      const card = await this.request<any>("/cards", "POST", {
        idList: listId,
        name,
        desc,
        due
      });

      console.log(`[Trello] Created card ${card.id}`);
      return {
        id: card.id,
        name: card.name,
        desc: card.desc,
        listId,
        boardId: card.idBoard,
        due: card.due,
        closed: card.closed,
        labels: card.labels || [],
        url: card.url
      };
    } catch (error: any) {
      console.error("[Trello] Failed to create card:", error.message);
      throw error;
    }
  }

  async updateCard(cardId: string, updates: { name?: string; desc?: string; due?: string; closed?: boolean; idList?: string }): Promise<TrelloCard> {
    try {
      const card = await this.request<any>(`/cards/${cardId}`, "PUT", updates);

      console.log(`[Trello] Updated card ${cardId}`);
      return {
        id: card.id,
        name: card.name,
        desc: card.desc,
        listId: card.idList,
        boardId: card.idBoard,
        due: card.due,
        closed: card.closed,
        labels: card.labels || [],
        url: card.url
      };
    } catch (error: any) {
      console.error("[Trello] Failed to update card:", error.message);
      throw error;
    }
  }

  async syncRFQsToList(listId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const rfqs = await storage.getRFQs(this.companyId);
      
      for (const rfq of rfqs.slice(0, 50)) {
        try {
          await this.createCard(
            listId,
            rfq.title,
            `Status: ${rfq.status}\nPriority: ${rfq.priority}\n\n${rfq.description || ""}`,
            rfq.deadline?.toISOString()
          );
          synced++;
        } catch (err: any) {
          errors.push(`RFQ ${rfq.title}: ${err.message}`);
        }
      }

      console.log(`[Trello] Synced ${synced} RFQs to list`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Trello] RFQ sync failed:", error.message);
      throw error;
    }
  }

  async syncSuppliersToList(listId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const suppliers = await storage.getSuppliers(this.companyId);
      
      for (const supplier of suppliers) {
        try {
          await this.createCard(
            listId,
            supplier.name,
            `Email: ${supplier.contactEmail || 'N/A'}`
          );
          synced++;
        } catch (err: any) {
          errors.push(`Supplier ${supplier.name}: ${err.message}`);
        }
      }

      console.log(`[Trello] Synced ${synced} suppliers to list`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Trello] Supplier sync failed:", error.message);
      throw error;
    }
  }

  async importCardsAsDemandSignals(listId: string): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const cards = await this.getListCards(listId);
      
      for (const card of cards.filter(c => !c.closed)) {
        try {
          await storage.createDemandSignal({
            companyId: this.companyId,
            signalType: "card",
            signalDate: new Date(),
            quantity: 1,
            unit: "units",
            channel: "trello",
            confidence: card.due ? 70 : 50,
            priority: "medium",
            attributes: {
              source: "trello",
              cardId: card.id,
              cardName: card.name,
              due: card.due
            }
          });
          synced++;
        } catch (err: any) {
          errors.push(`Card ${card.name}: ${err.message}`);
        }
      }

      console.log(`[Trello] Created ${synced} demand signals from cards`);
      return { synced, errors };
    } catch (error: any) {
      console.error("[Trello] Card import failed:", error.message);
      throw error;
    }
  }
}

export async function getTrelloIntegration(companyId: string): Promise<TrelloIntegration | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'trello');
    if (credentials?.apiKey && credentials?.accessToken) {
      console.log(`[Trello] Using centralized credential storage for company ${companyId}`);
      return new TrelloIntegration(credentials.apiKey, credentials.accessToken, companyId);
    }
  } catch (error) {
    console.log(`[Trello] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncTrelloData(companyId: string): Promise<{
  success: boolean;
  boards?: number;
  lists?: number;
  cards?: number;
  error?: string;
}> {
  const integration = await getTrelloIntegration(companyId);
  if (!integration) {
    return { success: false, error: 'Trello not configured' };
  }

  try {
    const connectionTest = await integration.testConnection();
    if (!connectionTest.success) {
      return { success: false, error: connectionTest.message };
    }

    const boards = await integration.listBoards();
    let totalLists = 0;
    let totalCards = 0;

    for (const board of boards.slice(0, 10)) {
      const lists = await integration.getBoardLists(board.id);
      totalLists += lists.length;
      for (const list of lists.slice(0, 5)) {
        const cards = await integration.getListCards(list.id);
        totalCards += cards.length;
      }
    }

    console.log(`[Trello] Full sync complete: ${boards.length} boards, ${totalLists} lists, ${totalCards} cards`);
    return {
      success: true,
      boards: boards.length,
      lists: totalLists,
      cards: totalCards
    };
  } catch (error: any) {
    console.error('[Trello] Sync failed:', error.message);
    return { success: false, error: error.message };
  }
}
