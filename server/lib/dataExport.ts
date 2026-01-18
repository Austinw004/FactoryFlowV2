import { storage as globalStorage } from '../storage';
import type { IStorage } from '../storage';

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  entities?: string[]; // Which entities to export (skus, materials, suppliers, etc.)
  companyName?: string; // Optional company name for export filename
}

export class DataExportService {
  constructor(private storage: IStorage) {}

  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      // Data export is an internal service that doesn't require external credentials
      console.log('[DataExport] Connection test successful');
      return { success: true, message: 'Data export service ready' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async exportCompanyData(companyId: string, options: ExportOptions): Promise<{ data: string; filename: string; contentType: string }> {
    const format = options.format || 'json';
    const companyName = options.companyName || `company_${companyId}`;
    const entities = options.entities || ['skus', 'materials', 'suppliers', 'allocations', 'machinery'];

    const exportData: Record<string, any> = {
      company: {
        id: companyId,
        name: companyName,
        exportedAt: new Date().toISOString(),
      },
      data: {},
    };

    if (entities.includes('skus')) {
      exportData.data.skus = await this.storage.getSkus(companyId);
    }

    if (entities.includes('materials')) {
      exportData.data.materials = await this.storage.getMaterials(companyId);
    }

    if (entities.includes('suppliers')) {
      exportData.data.suppliers = await this.storage.getSuppliers(companyId);
    }

    if (entities.includes('allocations')) {
      exportData.data.allocations = await this.storage.getAllocations(companyId);
    }

    if (entities.includes('machinery')) {
      exportData.data.machinery = await this.storage.getMachinery(companyId);
    }

    switch (format) {
      case 'json':
        return this.exportAsJSON(exportData, companyName);
      case 'csv':
        return this.exportAsCSV(exportData, companyName);
      case 'excel':
        return this.exportAsExcel(exportData, companyName);
      default:
        return this.exportAsJSON(exportData, companyName);
    }
  }

  async syncExportHistoryAsDemandSignals(companyId: string, exports: Array<{
    format: string;
    entityCount: number;
    exportedAt: Date;
  }>): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    for (const exp of exports) {
      try {
        await globalStorage.createDemandSignal({
          companyId,
          signalType: 'data_export',
          signalDate: exp.exportedAt,
          quantity: exp.entityCount,
          unit: 'entities',
          channel: 'data_export',
          confidence: 100,
          priority: 'low',
          attributes: {
            source: 'data_export',
            format: exp.format,
            entityCount: exp.entityCount
          }
        });
        synced++;
      } catch (err: any) {
        errors.push(`Export ${exp.format}: ${err.message}`);
      }
    }

    console.log(`[DataExport] Synced ${synced} export records as demand signals`);
    return { synced, errors };
  }

  private exportAsJSON(data: any, companyName: string): { data: string; filename: string; contentType: string } {
    return {
      data: JSON.stringify(data, null, 2),
      filename: `${companyName.replace(/[^a-z0-9]/gi, '_')}_export_${Date.now()}.json`,
      contentType: 'application/json',
    };
  }

  private exportAsCSV(data: any, companyName: string): { data: string; filename: string; contentType: string } {
    let csvContent = '';

    for (const [entityName, records] of Object.entries(data.data)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      csvContent += `\n# ${entityName.toUpperCase()}\n`;
      
      const headers = Object.keys(records[0]);
      csvContent += headers.join(',') + '\n';
      
      for (const record of records) {
        const values = headers.map(header => {
          const value = record[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvContent += values.join(',') + '\n';
      }
    }

    return {
      data: csvContent,
      filename: `${companyName.replace(/[^a-z0-9]/gi, '_')}_export_${Date.now()}.csv`,
      contentType: 'text/csv',
    };
  }

  private exportAsExcel(data: any, companyName: string): { data: string; filename: string; contentType: string } {
    return this.exportAsCSV(data, companyName);
  }
}
