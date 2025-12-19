import axios from 'axios';

export interface HubSpotContact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  properties?: Record<string, string>;
}

export interface HubSpotCompany {
  id?: string;
  name: string;
  domain?: string;
  industry?: string;
  properties?: Record<string, string>;
}

export interface HubSpotDeal {
  id?: string;
  dealname: string;
  amount?: number;
  dealstage?: string;
  closedate?: string;
  properties?: Record<string, string>;
}

export class HubSpotService {
  private accessToken: string | null = null;
  private baseUrl = 'https://api.hubapi.com';

  configure(accessToken: string) {
    this.accessToken = accessToken;
  }

  isConfigured(): boolean {
    return !!this.accessToken;
  }

  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    if (!this.accessToken) {
      throw new Error('HubSpot not configured');
    }

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        data,
      });
      return response.data;
    } catch (error: any) {
      console.error('[HubSpot] API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async getContacts(limit = 100): Promise<HubSpotContact[]> {
    const response = await this.request<{ results: any[] }>(
      'GET',
      `/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,company,phone`
    );
    return response.results.map(c => ({
      id: c.id,
      email: c.properties.email,
      firstName: c.properties.firstname,
      lastName: c.properties.lastname,
      company: c.properties.company,
      phone: c.properties.phone,
    }));
  }

  async createContact(contact: HubSpotContact): Promise<HubSpotContact> {
    const response = await this.request<{ id: string; properties: any }>(
      'POST',
      '/crm/v3/objects/contacts',
      {
        properties: {
          email: contact.email,
          firstname: contact.firstName,
          lastname: contact.lastName,
          company: contact.company,
          phone: contact.phone,
          ...contact.properties,
        },
      }
    );
    return {
      id: response.id,
      email: response.properties.email,
      firstName: response.properties.firstname,
      lastName: response.properties.lastname,
    };
  }

  async getCompanies(limit = 100): Promise<HubSpotCompany[]> {
    const response = await this.request<{ results: any[] }>(
      'GET',
      `/crm/v3/objects/companies?limit=${limit}&properties=name,domain,industry`
    );
    return response.results.map(c => ({
      id: c.id,
      name: c.properties.name,
      domain: c.properties.domain,
      industry: c.properties.industry,
    }));
  }

  async createCompany(company: HubSpotCompany): Promise<HubSpotCompany> {
    const response = await this.request<{ id: string; properties: any }>(
      'POST',
      '/crm/v3/objects/companies',
      {
        properties: {
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          ...company.properties,
        },
      }
    );
    return {
      id: response.id,
      name: response.properties.name,
      domain: response.properties.domain,
      industry: response.properties.industry,
    };
  }

  async getDeals(limit = 100): Promise<HubSpotDeal[]> {
    const response = await this.request<{ results: any[] }>(
      'GET',
      `/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate`
    );
    return response.results.map(d => ({
      id: d.id,
      dealname: d.properties.dealname,
      amount: d.properties.amount ? parseFloat(d.properties.amount) : undefined,
      dealstage: d.properties.dealstage,
      closedate: d.properties.closedate,
    }));
  }

  async createDeal(deal: HubSpotDeal): Promise<HubSpotDeal> {
    const response = await this.request<{ id: string; properties: any }>(
      'POST',
      '/crm/v3/objects/deals',
      {
        properties: {
          dealname: deal.dealname,
          amount: deal.amount?.toString(),
          dealstage: deal.dealstage || 'appointmentscheduled',
          closedate: deal.closedate,
          ...deal.properties,
        },
      }
    );
    return {
      id: response.id,
      dealname: response.properties.dealname,
      amount: response.properties.amount ? parseFloat(response.properties.amount) : undefined,
      dealstage: response.properties.dealstage,
    };
  }

  async syncSupplierToHubSpot(supplier: {
    name: string;
    email?: string;
    phone?: string;
    category?: string;
  }): Promise<{ companyId: string; contactId?: string }> {
    const company = await this.createCompany({
      name: supplier.name,
      industry: supplier.category,
      properties: {
        supplier_type: 'vendor',
      },
    });

    let contactId: string | undefined;
    if (supplier.email) {
      const contact = await this.createContact({
        email: supplier.email,
        company: supplier.name,
        phone: supplier.phone,
      });
      contactId = contact.id;
    }

    return { companyId: company.id!, contactId };
  }

  async testConnection(): Promise<{ success: boolean; message: string; accountInfo?: any }> {
    if (!this.accessToken) {
      return { success: false, message: 'HubSpot access token not configured' };
    }

    try {
      const response = await this.request<{ portalId: number; uiDomain: string }>(
        'GET',
        '/integrations/v1/me'
      );
      return {
        success: true,
        message: `Connected to HubSpot portal ${response.portalId}`,
        accountInfo: response,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

export const hubspotService = new HubSpotService();
