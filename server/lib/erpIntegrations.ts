import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { storage } from '../storage';
import { CredentialService } from './credentialService';

// ================================
// SAP S/4HANA INTEGRATION SERVICE
// ================================

interface SapConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  authMethod: 'oauth2' | 'basic' | 'api_key';
}

interface SapODataResponse<T> {
  d: {
    results?: T[];
    __count?: string;
  } | T;
}

export class SapS4HanaClient {
  private client: AxiosInstance;
  private config: SapConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: SapConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (reqConfig) => {
      const authHeader = await this.getAuthHeader();
      if (authHeader) {
        reqConfig.headers.Authorization = authHeader;
      }
      return reqConfig;
    });
  }

  private async getAuthHeader(): Promise<string | null> {
    switch (this.config.authMethod) {
      case 'oauth2':
        return await this.getOAuth2Token();
      case 'basic':
        const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        return `Basic ${credentials}`;
      case 'api_key':
        return `APIKey ${this.config.apiKey}`;
      default:
        return null;
    }
  }

  private async getOAuth2Token(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return `Bearer ${this.accessToken}`;
    }

    try {
      const tokenUrl = `${this.config.baseUrl}/oauth/token`;
      const response = await axios.post(tokenUrl, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId || '',
          client_secret: this.config.clientSecret || '',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000);
      return `Bearer ${this.accessToken}`;
    } catch (error) {
      console.error('SAP OAuth token error:', error);
      return null;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const response = await this.client.get('/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$top=1');
      return { 
        success: true, 
        message: 'Successfully connected to SAP S/4HANA',
        details: { 
          endpoint: this.config.baseUrl,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        success: false, 
        message: `Connection failed: ${axiosError.message}`,
        details: { 
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        }
      };
    }
  }

  async getPurchaseOrders(params?: { 
    top?: number; 
    skip?: number; 
    filter?: string;
    fromDate?: Date;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.top) queryParams.append('$top', params.top.toString());
      if (params?.skip) queryParams.append('$skip', params.skip.toString());
      if (params?.filter) queryParams.append('$filter', params.filter);
      if (params?.fromDate) {
        const dateFilter = `CreationDate ge datetime'${params.fromDate.toISOString()}'`;
        queryParams.append('$filter', dateFilter);
      }
      queryParams.append('$format', 'json');

      const response = await this.client.get<SapODataResponse<any>>(
        `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder?${queryParams}`
      );

      const data = response.data.d;
      return Array.isArray(data) ? data : (data as any).results || [];
    } catch (error) {
      console.error('Error fetching SAP purchase orders:', error);
      throw error;
    }
  }

  async getInventoryLevels(params?: {
    plant?: string;
    material?: string;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.plant) queryParams.append('$filter', `Plant eq '${params.plant}'`);
      if (params?.material) {
        const existingFilter = queryParams.get('$filter');
        const materialFilter = `Material eq '${params.material}'`;
        queryParams.set('$filter', existingFilter ? `${existingFilter} and ${materialFilter}` : materialFilter);
      }
      queryParams.append('$format', 'json');

      const response = await this.client.get<SapODataResponse<any>>(
        `/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MatlStkInAcctMod?${queryParams}`
      );

      const data = response.data.d;
      return Array.isArray(data) ? data : (data as any).results || [];
    } catch (error) {
      console.error('Error fetching SAP inventory:', error);
      throw error;
    }
  }

  async getMaterials(params?: { top?: number; skip?: number }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.top) queryParams.append('$top', params.top.toString());
      if (params?.skip) queryParams.append('$skip', params.skip.toString());
      queryParams.append('$format', 'json');

      const response = await this.client.get<SapODataResponse<any>>(
        `/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product?${queryParams}`
      );

      const data = response.data.d;
      return Array.isArray(data) ? data : (data as any).results || [];
    } catch (error) {
      console.error('Error fetching SAP materials:', error);
      throw error;
    }
  }

  async getSuppliers(params?: { top?: number; skip?: number }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.top) queryParams.append('$top', params.top.toString());
      if (params?.skip) queryParams.append('$skip', params.skip.toString());
      queryParams.append('$filter', "BusinessPartnerCategory eq '2'"); // Suppliers only
      queryParams.append('$format', 'json');

      const response = await this.client.get<SapODataResponse<any>>(
        `/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?${queryParams}`
      );

      const data = response.data.d;
      return Array.isArray(data) ? data : (data as any).results || [];
    } catch (error) {
      console.error('Error fetching SAP suppliers:', error);
      throw error;
    }
  }

  async createPurchaseOrder(poData: {
    supplier: string;
    purchasingOrganization: string;
    purchasingGroup: string;
    items: Array<{
      material: string;
      plant: string;
      quantity: number;
      unit: string;
      netPrice?: number;
    }>;
  }): Promise<any> {
    try {
      const payload = {
        Supplier: poData.supplier,
        PurchasingOrganization: poData.purchasingOrganization,
        PurchasingGroup: poData.purchasingGroup,
        to_PurchaseOrderItem: poData.items.map((item, index) => ({
          PurchaseOrderItem: String((index + 1) * 10).padStart(5, '0'),
          Material: item.material,
          Plant: item.plant,
          OrderQuantity: item.quantity,
          PurchaseOrderQuantityUnit: item.unit,
          NetPriceAmount: item.netPrice,
        })),
      };

      const response = await this.client.post(
        '/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder',
        payload
      );

      return response.data.d;
    } catch (error) {
      console.error('Error creating SAP purchase order:', error);
      throw error;
    }
  }

  transformToStandardFormat(sapData: any[], type: 'inventory' | 'purchase_order' | 'material' | 'supplier'): any[] {
    switch (type) {
      case 'inventory':
        return sapData.map(item => ({
          materialCode: item.Material,
          plant: item.Plant,
          storageLocation: item.StorageLocation,
          quantity: parseFloat(item.MatlWrhsStkQtyInMatlBaseUnit || '0'),
          unit: item.MaterialBaseUnit,
          valuationType: item.ValuationType,
          lastUpdated: new Date().toISOString(),
          source: 'sap_s4hana',
        }));
      
      case 'purchase_order':
        return sapData.map(po => ({
          poNumber: po.PurchaseOrder,
          supplier: po.Supplier,
          creationDate: po.CreationDate,
          status: po.PurchasingDocumentDeletionCode === '' ? 'active' : 'deleted',
          totalAmount: parseFloat(po.TotalNetAmount || '0'),
          currency: po.DocumentCurrency,
          purchasingOrg: po.PurchasingOrganization,
          source: 'sap_s4hana',
        }));
      
      case 'material':
        return sapData.map(mat => ({
          code: mat.Product,
          name: mat.ProductDescription || mat.Product,
          type: mat.ProductType,
          baseUnit: mat.BaseUnit,
          materialGroup: mat.ProductGroup,
          source: 'sap_s4hana',
        }));
      
      case 'supplier':
        return sapData.map(sup => ({
          id: sup.BusinessPartner,
          name: sup.BusinessPartnerFullName || sup.BusinessPartnerName,
          country: sup.Country,
          city: sup.CityName,
          isActive: sup.BusinessPartnerIsBlocked === false,
          source: 'sap_s4hana',
        }));
      
      default:
        return sapData;
    }
  }
}

// ================================
// ORACLE ERP CLOUD INTEGRATION
// ================================

interface OracleConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  authMethod: 'oauth2' | 'basic';
}

export class OracleErpClient {
  private client: AxiosInstance;
  private config: OracleConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: OracleConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(async (reqConfig) => {
      const authHeader = await this.getAuthHeader();
      if (authHeader) {
        reqConfig.headers.Authorization = authHeader;
      }
      return reqConfig;
    });
  }

  private async getAuthHeader(): Promise<string | null> {
    switch (this.config.authMethod) {
      case 'oauth2':
        return await this.getOAuth2Token();
      case 'basic':
        const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        return `Basic ${credentials}`;
      default:
        return null;
    }
  }

  private async getOAuth2Token(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return `Bearer ${this.accessToken}`;
    }

    try {
      const tokenUrl = `${this.config.baseUrl}/oauth2/v1/token`;
      const response = await axios.post(tokenUrl, 
        new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'urn:opc:idm:__myscopes__',
        }),
        { 
          headers: { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
          } 
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000) - 60000);
      return `Bearer ${this.accessToken}`;
    } catch (error) {
      console.error('Oracle OAuth token error:', error);
      return null;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const response = await this.client.get('/fscmRestApi/resources/11.13.18.05/inventoryOrganizations?limit=1');
      return { 
        success: true, 
        message: 'Successfully connected to Oracle ERP Cloud',
        details: { 
          endpoint: this.config.baseUrl,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return { 
        success: false, 
        message: `Connection failed: ${axiosError.message}`,
        details: { 
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        }
      };
    }
  }

  async getPurchaseOrders(params?: {
    limit?: number;
    offset?: number;
    fromDate?: Date;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.fromDate) {
        queryParams.append('q', `CreationDate >= ${params.fromDate.toISOString().split('T')[0]}`);
      }

      const response = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/purchaseOrders?${queryParams}`
      );

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Oracle purchase orders:', error);
      throw error;
    }
  }

  async getInventoryBalances(params?: {
    organizationCode?: string;
    itemNumber?: string;
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.organizationCode) {
        queryParams.append('q', `OrganizationCode=${params.organizationCode}`);
      }

      const response = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/inventoryBalances?${queryParams}`
      );

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Oracle inventory:', error);
      throw error;
    }
  }

  async getItems(params?: { limit?: number; offset?: number }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/items?${queryParams}`
      );

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Oracle items:', error);
      throw error;
    }
  }

  async getSuppliers(params?: { limit?: number; offset?: number }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await this.client.get(
        `/fscmRestApi/resources/11.13.18.05/suppliers?${queryParams}`
      );

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching Oracle suppliers:', error);
      throw error;
    }
  }

  async createPurchaseOrder(poData: {
    procurementBUId: number;
    buyerId: number;
    supplierId: number;
    lines: Array<{
      itemId: number;
      quantity: number;
      unitOfMeasure: string;
      price?: number;
    }>;
  }): Promise<any> {
    try {
      const payload = {
        ProcurementBUId: poData.procurementBUId,
        BuyerId: poData.buyerId,
        SupplierId: poData.supplierId,
        lines: poData.lines.map((line, index) => ({
          LineNumber: index + 1,
          ItemId: line.itemId,
          Quantity: line.quantity,
          UnitOfMeasure: line.unitOfMeasure,
          Price: line.price,
        })),
      };

      const response = await this.client.post(
        '/fscmRestApi/resources/11.13.18.05/purchaseOrders',
        payload
      );

      return response.data;
    } catch (error) {
      console.error('Error creating Oracle purchase order:', error);
      throw error;
    }
  }

  transformToStandardFormat(oracleData: any[], type: 'inventory' | 'purchase_order' | 'item' | 'supplier'): any[] {
    switch (type) {
      case 'inventory':
        return oracleData.map(item => ({
          materialCode: item.ItemNumber,
          organizationCode: item.OrganizationCode,
          subinventory: item.Subinventory,
          quantity: parseFloat(item.OnhandQuantity || '0'),
          unit: item.PrimaryUOMCode,
          lastUpdated: item.LastUpdateDate,
          source: 'oracle_erp',
        }));
      
      case 'purchase_order':
        return oracleData.map(po => ({
          poNumber: po.OrderNumber,
          supplier: po.SupplierName || po.SupplierId,
          creationDate: po.CreationDate,
          status: po.Status,
          totalAmount: parseFloat(po.TotalAmount || '0'),
          currency: po.CurrencyCode,
          procurementBU: po.ProcurementBU,
          source: 'oracle_erp',
        }));
      
      case 'item':
        return oracleData.map(item => ({
          code: item.ItemNumber,
          name: item.Description || item.ItemNumber,
          status: item.ItemStatus,
          baseUnit: item.PrimaryUOMCode,
          itemType: item.ItemType,
          source: 'oracle_erp',
        }));
      
      case 'supplier':
        return oracleData.map(sup => ({
          id: sup.SupplierId,
          name: sup.Supplier,
          country: sup.Country,
          status: sup.Status,
          isActive: sup.Status === 'ACTIVE',
          source: 'oracle_erp',
        }));
      
      default:
        return oracleData;
    }
  }
}

// ================================
// MICROSOFT DYNAMICS 365 INTEGRATION
// ================================

interface Dynamics365Config {
  baseUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  environment: string;
}

export class Dynamics365Client {
  private client: AxiosInstance;
  private config: Dynamics365Config;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: Dynamics365Config) {
    this.config = config;
    this.client = axios.create({
      baseURL: `${config.baseUrl}/data/v9.2`,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    });

    this.client.interceptors.request.use(async (reqConfig) => {
      const token = await this.getAccessToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    });
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }
    try {
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      const response = await axios.post(tokenUrl, new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: `${this.config.baseUrl}/.default`,
        grant_type: 'client_credentials',
      }));
      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      return this.accessToken;
    } catch (error) {
      console.error('Dynamics 365 OAuth token error:', (error as Error).message);
      return null;
    }
  }

  async getInventoryLevels(): Promise<any[]> {
    const response = await this.client.get('/InventOnHandEntities', {
      params: { '$top': 1000, '$select': 'ItemNumber,InventoryWarehouse,AvailableOnHandQuantity,PhysicalInventory' },
    });
    return response.data.value || [];
  }

  async getPurchaseOrders(options?: { fromDate?: Date }): Promise<any[]> {
    let filter = '';
    if (options?.fromDate) {
      filter = `PurchaseOrderDate ge ${options.fromDate.toISOString().split('T')[0]}`;
    }
    const response = await this.client.get('/PurchaseOrderHeadersV2', {
      params: { '$top': 500, '$filter': filter || undefined },
    });
    return response.data.value || [];
  }

  async getItems(): Promise<any[]> {
    const response = await this.client.get('/ReleasedProductsV2', {
      params: { '$top': 1000, '$select': 'ItemNumber,ProductName,ProductType,ProductGroupId' },
    });
    return response.data.value || [];
  }

  async getSuppliers(): Promise<any[]> {
    const response = await this.client.get('/VendorsV2', {
      params: { '$top': 500, '$select': 'VendorAccountNumber,VendorOrganizationName,AddressCountryRegionId,VendorGroupId' },
    });
    return response.data.value || [];
  }

  transformToStandardFormat(data: any[], type: string): any[] {
    switch (type) {
      case 'inventory':
        return data.map(item => ({
          materialCode: item.ItemNumber,
          plant: item.InventoryWarehouse,
          quantity: parseFloat(item.AvailableOnHandQuantity || '0'),
          physicalQuantity: parseFloat(item.PhysicalInventory || '0'),
          lastUpdated: new Date().toISOString(),
          source: 'dynamics365',
        }));
      case 'purchase_order':
        return data.map(po => ({
          poNumber: po.PurchaseOrderNumber,
          supplier: po.OrderVendorAccountNumber,
          creationDate: po.PurchaseOrderDate,
          status: po.PurchaseOrderStatus,
          currency: po.CurrencyCode,
          source: 'dynamics365',
        }));
      case 'item':
        return data.map(item => ({
          code: item.ItemNumber,
          name: item.ProductName || item.ItemNumber,
          type: item.ProductType,
          materialGroup: item.ProductGroupId,
          source: 'dynamics365',
        }));
      case 'supplier':
        return data.map(sup => ({
          id: sup.VendorAccountNumber,
          name: sup.VendorOrganizationName,
          country: sup.AddressCountryRegionId,
          group: sup.VendorGroupId,
          isActive: true,
          source: 'dynamics365',
        }));
      default:
        return data;
    }
  }
}

// ================================
// NETSUITE ERP INTEGRATION
// ================================

interface NetSuiteErpConfig {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  baseUrl?: string;
}

export class NetSuiteErpClient {
  private config: NetSuiteErpConfig;
  private baseUrl: string;

  constructor(config: NetSuiteErpConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || `https://${config.accountId}.suitetalk.api.netsuite.com/services/rest/record/v1`;
  }

  private generateOAuthHeader(method: string, url: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const params: Record<string, string> = {
      oauth_consumer_key: this.config.consumerKey,
      oauth_token: this.config.tokenId,
      oauth_signature_method: 'HMAC-SHA256',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: '1.0',
    };
    const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(
      Object.entries(params).sort().map(([k, v]) => `${k}=${v}`).join('&')
    )}`;
    const signingKey = `${encodeURIComponent(this.config.consumerSecret)}&${encodeURIComponent(this.config.tokenSecret)}`;
    const signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');
    params.oauth_signature = signature;
    return 'OAuth ' + Object.entries(params).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ');
  }

  private async request(endpoint: string, params?: Record<string, string>): Promise<any[]> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': this.generateOAuthHeader('GET', url),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      params: { limit: 1000, ...params },
      timeout: 30000,
    });
    return response.data.items || response.data.results || [];
  }

  async getInventoryLevels(): Promise<any[]> {
    return this.request('inventoryItem', { fields: 'itemId,displayName,quantityOnHand,quantityAvailable,location' });
  }

  async getPurchaseOrders(options?: { fromDate?: Date }): Promise<any[]> {
    return this.request('purchaseOrder', { fields: 'tranId,entity,tranDate,status,total,currency' });
  }

  async getItems(): Promise<any[]> {
    return this.request('inventoryItem', { fields: 'itemId,displayName,type,unitsType,itemGroup' });
  }

  async getSuppliers(): Promise<any[]> {
    return this.request('vendor', { fields: 'entityId,companyName,country,isInactive,category' });
  }

  transformToStandardFormat(data: any[], type: string): any[] {
    switch (type) {
      case 'inventory':
        return data.map(item => ({
          materialCode: item.itemId,
          name: item.displayName,
          quantity: parseFloat(item.quantityOnHand || '0'),
          available: parseFloat(item.quantityAvailable || '0'),
          location: item.location,
          lastUpdated: new Date().toISOString(),
          source: 'netsuite',
        }));
      case 'purchase_order':
        return data.map(po => ({
          poNumber: po.tranId,
          supplier: po.entity,
          creationDate: po.tranDate,
          status: po.status,
          totalAmount: parseFloat(po.total || '0'),
          currency: po.currency,
          source: 'netsuite',
        }));
      case 'item':
        return data.map(item => ({
          code: item.itemId,
          name: item.displayName || item.itemId,
          type: item.type,
          unitType: item.unitsType,
          materialGroup: item.itemGroup,
          source: 'netsuite',
        }));
      case 'supplier':
        return data.map(sup => ({
          id: sup.entityId,
          name: sup.companyName,
          country: sup.country,
          category: sup.category,
          isActive: !sup.isInactive,
          source: 'netsuite',
        }));
      default:
        return data;
    }
  }
}

// ================================
// ERP FACTORY - Create appropriate client
// ================================

export type ErpType = 'sap_s4hana' | 'oracle_erp' | 'dynamics365' | 'netsuite';

export function createErpClient(
  erpType: ErpType,
  config: any
): SapS4HanaClient | OracleErpClient | Dynamics365Client | NetSuiteErpClient | null {
  switch (erpType) {
    case 'sap_s4hana':
      return new SapS4HanaClient(config as SapConfig);
    case 'oracle_erp':
      return new OracleErpClient(config as OracleConfig);
    case 'dynamics365':
      return new Dynamics365Client(config as Dynamics365Config);
    case 'netsuite':
      return new NetSuiteErpClient(config as NetSuiteErpConfig);
    default:
      console.warn(`ERP type ${erpType} not yet supported`);
      return null;
  }
}

// ================================
// SYNC SERVICE - Orchestrates data sync
// ================================

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  errors: string[];
  duration: number;
  details?: any;
}

export async function syncErpData(
  erpClient: SapS4HanaClient | OracleErpClient | Dynamics365Client | NetSuiteErpClient,
  erpType: ErpType,
  dataType: 'inventory' | 'purchase_orders' | 'materials' | 'suppliers',
  options?: { fullSync?: boolean; fromDate?: Date }
): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let recordsProcessed = 0;

  try {
    let rawData: any[] = [];

    if (erpClient instanceof SapS4HanaClient) {
      switch (dataType) {
        case 'inventory':
          rawData = await erpClient.getInventoryLevels();
          rawData = erpClient.transformToStandardFormat(rawData, 'inventory');
          break;
        case 'purchase_orders':
          rawData = await erpClient.getPurchaseOrders({ fromDate: options?.fromDate });
          rawData = erpClient.transformToStandardFormat(rawData, 'purchase_order');
          break;
        case 'materials':
          rawData = await erpClient.getMaterials();
          rawData = erpClient.transformToStandardFormat(rawData, 'material');
          break;
        case 'suppliers':
          rawData = await erpClient.getSuppliers();
          rawData = erpClient.transformToStandardFormat(rawData, 'supplier');
          break;
      }
    } else if (erpClient instanceof OracleErpClient) {
      switch (dataType) {
        case 'inventory':
          rawData = await erpClient.getInventoryBalances();
          rawData = erpClient.transformToStandardFormat(rawData, 'inventory');
          break;
        case 'purchase_orders':
          rawData = await erpClient.getPurchaseOrders({ fromDate: options?.fromDate });
          rawData = erpClient.transformToStandardFormat(rawData, 'purchase_order');
          break;
        case 'materials':
          rawData = await erpClient.getItems();
          rawData = erpClient.transformToStandardFormat(rawData, 'item');
          break;
        case 'suppliers':
          rawData = await erpClient.getSuppliers();
          rawData = erpClient.transformToStandardFormat(rawData, 'supplier');
          break;
      }
    } else if (erpClient instanceof Dynamics365Client) {
      switch (dataType) {
        case 'inventory':
          rawData = await erpClient.getInventoryLevels();
          rawData = erpClient.transformToStandardFormat(rawData, 'inventory');
          break;
        case 'purchase_orders':
          rawData = await erpClient.getPurchaseOrders({ fromDate: options?.fromDate });
          rawData = erpClient.transformToStandardFormat(rawData, 'purchase_order');
          break;
        case 'materials':
          rawData = await erpClient.getItems();
          rawData = erpClient.transformToStandardFormat(rawData, 'item');
          break;
        case 'suppliers':
          rawData = await erpClient.getSuppliers();
          rawData = erpClient.transformToStandardFormat(rawData, 'supplier');
          break;
      }
    } else if (erpClient instanceof NetSuiteErpClient) {
      switch (dataType) {
        case 'inventory':
          rawData = await erpClient.getInventoryLevels();
          rawData = erpClient.transformToStandardFormat(rawData, 'inventory');
          break;
        case 'purchase_orders':
          rawData = await erpClient.getPurchaseOrders({ fromDate: options?.fromDate });
          rawData = erpClient.transformToStandardFormat(rawData, 'purchase_order');
          break;
        case 'materials':
          rawData = await erpClient.getItems();
          rawData = erpClient.transformToStandardFormat(rawData, 'item');
          break;
        case 'suppliers':
          rawData = await erpClient.getSuppliers();
          rawData = erpClient.transformToStandardFormat(rawData, 'supplier');
          break;
      }
    }

    recordsProcessed = rawData.length;

    return {
      success: true,
      recordsProcessed,
      errors,
      duration: Date.now() - startTime,
      details: { dataType, erpType, sampleRecord: rawData[0] },
    };
  } catch (error) {
    errors.push((error as Error).message);
    return {
      success: false,
      recordsProcessed,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

export async function getSapClient(companyId: string): Promise<SapS4HanaClient | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'sap');
    if (credentials?.instanceUrl && credentials?.username && credentials?.password) {
      console.log(`[SAP] Using centralized credential storage for company ${companyId}`);
      return new SapS4HanaClient({
        baseUrl: credentials.instanceUrl,
        username: credentials.username,
        password: credentials.password,
        authMethod: 'basic'
      });
    }
    if (credentials?.instanceUrl && credentials?.clientId && credentials?.clientSecret) {
      console.log(`[SAP] Using OAuth2 credentials for company ${companyId}`);
      return new SapS4HanaClient({
        baseUrl: credentials.instanceUrl,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        authMethod: 'oauth2'
      });
    }
  } catch (error) {
    console.log(`[SAP] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function getOracleClient(companyId: string): Promise<OracleErpClient | null> {
  try {
    const credentials = await CredentialService.getDecryptedCredentials(companyId, 'oracle');
    if (credentials?.instanceUrl && credentials?.username && credentials?.password) {
      console.log(`[Oracle] Using centralized credential storage for company ${companyId}`);
      return new OracleErpClient({
        baseUrl: credentials.instanceUrl,
        username: credentials.username,
        password: credentials.password,
        authMethod: 'basic'
      });
    }
    if (credentials?.instanceUrl && credentials?.clientId && credentials?.clientSecret) {
      console.log(`[Oracle] Using OAuth2 credentials for company ${companyId}`);
      return new OracleErpClient({
        baseUrl: credentials.instanceUrl,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        authMethod: 'oauth2'
      });
    }
  } catch (error) {
    console.log(`[Oracle] Credentials not available for company ${companyId}`);
  }
  return null;
}

export async function syncSapMaterialsToStorage(companyId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const client = await getSapClient(companyId);
    if (!client) {
      return { synced: 0, errors: ['SAP not configured'] };
    }

    const materials = await client.getMaterials({ top: 500 });
    const transformed = client.transformToStandardFormat(materials, 'material');

    for (const mat of transformed) {
      try {
        const existing = await storage.getMaterials(companyId);
        const exists = existing.find(m => m.code === mat.code);
        
        if (!exists) {
          await storage.createMaterial({
            companyId,
            code: mat.code,
            name: mat.name,
            unit: mat.baseUnit || 'units',
            onHand: 0
          });
          synced++;
        }
      } catch (err: any) {
        errors.push(`Material ${mat.code}: ${err.message}`);
      }
    }

    console.log(`[SAP] Synced ${synced} materials to storage`);
    return { synced, errors };
  } catch (error: any) {
    return { synced: 0, errors: [error.message] };
  }
}

export async function syncSapSuppliersToStorage(companyId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const client = await getSapClient(companyId);
    if (!client) {
      return { synced: 0, errors: ['SAP not configured'] };
    }

    const suppliers = await client.getSuppliers({ top: 500 });
    const transformed = client.transformToStandardFormat(suppliers, 'supplier');

    for (const sup of transformed) {
      try {
        const existing = await storage.getSuppliers(companyId);
        const exists = existing.find(s => s.name === sup.name);
        
        if (!exists && sup.name) {
          await storage.createSupplier({
            companyId,
            name: sup.name,
            contactEmail: ''
          });
          synced++;
        }
      } catch (err: any) {
        errors.push(`Supplier ${sup.name}: ${err.message}`);
      }
    }

    console.log(`[SAP] Synced ${synced} suppliers to storage`);
    return { synced, errors };
  } catch (error: any) {
    return { synced: 0, errors: [error.message] };
  }
}

export async function syncSapPurchaseOrdersAsDemandSignals(companyId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const client = await getSapClient(companyId);
    if (!client) {
      return { synced: 0, errors: ['SAP not configured'] };
    }

    const purchaseOrders = await client.getPurchaseOrders({ top: 100 });
    const transformed = client.transformToStandardFormat(purchaseOrders, 'purchase_order');

    for (const po of transformed) {
      try {
        await storage.createDemandSignal({
          companyId,
          signalType: 'purchase_order',
          signalDate: new Date(po.creationDate) || new Date(),
          quantity: po.totalAmount || 1,
          unit: po.currency || 'USD',
          channel: 'sap',
          customer: po.supplier,
          confidence: 95,
          priority: 'medium',
          attributes: {
            source: 'sap_s4hana',
            poNumber: po.poNumber,
            status: po.status,
            purchasingOrg: po.purchasingOrg
          }
        });
        synced++;
      } catch (err: any) {
        errors.push(`PO ${po.poNumber}: ${err.message}`);
      }
    }

    console.log(`[SAP] Synced ${synced} purchase orders as demand signals`);
    return { synced, errors };
  } catch (error: any) {
    return { synced: 0, errors: [error.message] };
  }
}

export async function syncOracleMaterialsToStorage(companyId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const client = await getOracleClient(companyId);
    if (!client) {
      return { synced: 0, errors: ['Oracle not configured'] };
    }

    const items = await client.getItems({ limit: 500 });
    const transformed = client.transformToStandardFormat(items, 'item');

    for (const item of transformed) {
      try {
        const existing = await storage.getMaterials(companyId);
        const exists = existing.find(m => m.code === item.code);
        
        if (!exists) {
          await storage.createMaterial({
            companyId,
            code: item.code,
            name: item.name,
            unit: item.baseUnit || 'units',
            onHand: 0
          });
          synced++;
        }
      } catch (err: any) {
        errors.push(`Item ${item.code}: ${err.message}`);
      }
    }

    console.log(`[Oracle] Synced ${synced} items to storage`);
    return { synced, errors };
  } catch (error: any) {
    return { synced: 0, errors: [error.message] };
  }
}

export async function syncOracleSuppliersToStorage(companyId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const client = await getOracleClient(companyId);
    if (!client) {
      return { synced: 0, errors: ['Oracle not configured'] };
    }

    const suppliers = await client.getSuppliers({ limit: 500 });
    const transformed = client.transformToStandardFormat(suppliers, 'supplier');

    for (const sup of transformed) {
      try {
        const existing = await storage.getSuppliers(companyId);
        const exists = existing.find(s => s.name === sup.name);
        
        if (!exists && sup.name) {
          await storage.createSupplier({
            companyId,
            name: sup.name,
            contactEmail: ''
          });
          synced++;
        }
      } catch (err: any) {
        errors.push(`Supplier ${sup.name}: ${err.message}`);
      }
    }

    console.log(`[Oracle] Synced ${synced} suppliers to storage`);
    return { synced, errors };
  } catch (error: any) {
    return { synced: 0, errors: [error.message] };
  }
}

export async function syncOraclePurchaseOrdersAsDemandSignals(companyId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    const client = await getOracleClient(companyId);
    if (!client) {
      return { synced: 0, errors: ['Oracle not configured'] };
    }

    const purchaseOrders = await client.getPurchaseOrders({ limit: 100 });
    const transformed = client.transformToStandardFormat(purchaseOrders, 'purchase_order');

    for (const po of transformed) {
      try {
        await storage.createDemandSignal({
          companyId,
          signalType: 'purchase_order',
          signalDate: new Date(po.creationDate) || new Date(),
          quantity: po.totalAmount || 1,
          unit: po.currency || 'USD',
          channel: 'oracle',
          customer: po.supplier,
          confidence: 95,
          priority: 'medium',
          attributes: {
            source: 'oracle_erp',
            poNumber: po.poNumber,
            status: po.status,
            procurementBU: po.procurementBU
          }
        });
        synced++;
      } catch (err: any) {
        errors.push(`PO ${po.poNumber}: ${err.message}`);
      }
    }

    console.log(`[Oracle] Synced ${synced} purchase orders as demand signals`);
    return { synced, errors };
  } catch (error: any) {
    return { synced: 0, errors: [error.message] };
  }
}
