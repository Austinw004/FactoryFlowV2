import type { IStorage } from '../storage';

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  entities?: string[]; // Which entities to export (skus, materials, suppliers, etc.)
}

export class DataExportService {
  constructor(private storage: IStorage) {}

  async exportCompanyData(companyId: string, options: ExportOptions): Promise<{ data: string; filename: string; contentType: string }> {
    const company = await this.storage.getCompany(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const format = options.format || company.exportDataFormat || 'json';
    const entities = options.entities || ['skus', 'materials', 'suppliers', 'allocations', 'machinery'];

    const exportData: Record<string, any> = {
      company: {
        id: company.id,
        name: company.name,
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
        return this.exportAsJSON(exportData, company.name);
      case 'csv':
        return this.exportAsCSV(exportData, company.name);
      case 'excel':
        return this.exportAsExcel(exportData, company.name);
      default:
        return this.exportAsJSON(exportData, company.name);
    }
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
