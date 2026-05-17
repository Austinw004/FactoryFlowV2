import { parse } from 'csv-parse/sync';
import type { IStorage } from '../storage';
import { z } from 'zod';
import { insertSkuSchema, insertMaterialSchema, insertSupplierSchema } from '@shared/schema';

type ImportEntity = 'skus' | 'materials' | 'suppliers';

interface ImportResult {
  entity: ImportEntity;
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

interface ImportOptions {
  entity: ImportEntity;
  updateExisting?: boolean;
}

export class DataImportService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async importFromCSV(
    companyId: string,
    csvContent: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const { entity, updateExisting = false } = options;

    const result: ImportResult = {
      entity,
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      result.total = records.length;

      // Cache existing entities once to avoid O(n^2) lookups
      const existingEntities = await this.getExistingEntities(companyId, entity);

      for (let i = 0; i < records.length; i++) {
        const rowNumber = i + 2;
        const record = records[i];

        try {
          const data = this.mapRecordToEntity(entity, record, companyId);
          
          if (entity === 'skus') {
            await this.importSKU(data, updateExisting, existingEntities);
          } else if (entity === 'materials') {
            await this.importMaterial(data, updateExisting, existingEntities);
          } else if (entity === 'suppliers') {
            await this.importSupplier(data, updateExisting, existingEntities);
          }

          result.successful++;
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            error: error.message,
            data: record,
          });
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to parse CSV: ${error.message}`);
    }

    return result;
  }

  private mapRecordToEntity(entity: ImportEntity, record: any, companyId: string): any {
    if (entity === 'skus') {
      return {
        companyId,
        code: record.code,
        name: record.name,
        priority: record.priority ? parseInt(record.priority, 10) : undefined,
      };
    }

    // Round-13 audit caught this: prior mapper was written against an
    // older simplified-then-evolved schema. The fields below no longer
    // exist on the materials table at all (category/currentPrice/
    // quantityAvailable/reorderPoint/leadTimeDays were never in the
    // current shape). The actual columns are: code, name, unit, onHand,
    // inbound. Result was 100% CSV import failure for materials in prod
    // — every uploaded row failed insertMaterialSchema validation because
    // the required `code` field was never mapped in.
    if (entity === 'materials') {
      return {
        companyId,
        code: record.code,
        name: record.name,
        unit: record.unit,
        onHand: record.onHand !== undefined && record.onHand !== ''
          ? parseFloat(record.onHand)
          : 0,
        inbound: record.inbound !== undefined && record.inbound !== ''
          ? parseFloat(record.inbound)
          : 0,
      };
    }

    // Same issue for suppliers — prior mapper referenced
    // contactPhone/location/reliabilityScore/leadTimeDays which aren't
    // on the current suppliers table. Actual columns are: name,
    // contactEmail, materialCategories[]. Per-supplier lead time + risk
    // live on supplierMaterials / supplierNodes, not directly on suppliers.
    if (entity === 'suppliers') {
      const cats = record.materialCategories || record.categories;
      return {
        companyId,
        name: record.name,
        contactEmail: record.contactEmail || record.email || undefined,
        materialCategories: cats
          ? String(cats).split(/[,;|]/).map((s: string) => s.trim()).filter(Boolean)
          : undefined,
      };
    }

    return { ...record, companyId };
  }

  private async getExistingEntities(companyId: string, entity: ImportEntity): Promise<any[]> {
    if (entity === 'skus') {
      return await this.storage.getSkus(companyId);
    } else if (entity === 'materials') {
      return await this.storage.getMaterials(companyId);
    } else if (entity === 'suppliers') {
      return await this.storage.getSuppliers(companyId);
    }
    return [];
  }

  private async importSKU(data: any, updateExisting: boolean, existingSkus: any[]): Promise<void> {
    const validatedData = insertSkuSchema.parse(data);

    const existing = existingSkus.find((s: any) => s.code === validatedData.code);

    if (existing) {
      if (updateExisting) {
        const { companyId: _c, code: _k, ...updateFields } = validatedData as any;
        await this.storage.updateSku(existing.id, updateFields);
      } else {
        throw new Error(`SKU with code ${validatedData.code} already exists`);
      }
    } else {
      await this.storage.createSku(validatedData);
    }
  }

  private async importMaterial(data: any, updateExisting: boolean, existingMaterials: any[]): Promise<void> {
    const validatedData = insertMaterialSchema.parse(data);

    const existing = existingMaterials.find((m: any) => m.name === validatedData.name);

    if (existing) {
      if (updateExisting) {
        const { companyId: _c, name: _k, ...updateFields } = validatedData as any;
        await this.storage.updateMaterial(existing.id, updateFields);
      } else {
        throw new Error(`Material with name ${validatedData.name} already exists`);
      }
    } else {
      await this.storage.createMaterial(validatedData);
    }
  }

  private async importSupplier(data: any, updateExisting: boolean, existingSuppliers: any[]): Promise<void> {
    const validatedData = insertSupplierSchema.parse(data);

    const existing = existingSuppliers.find((s: any) => s.name === validatedData.name);

    if (existing) {
      if (updateExisting) {
        const { companyId: _c, name: _k, ...updateFields } = validatedData as any;
        await this.storage.updateSupplier(existing.id, updateFields);
      } else {
        throw new Error(`Supplier with name ${validatedData.name} already exists`);
      }
    } else {
      await this.storage.createSupplier(validatedData);
    }
  }

  async generateTemplate(entity: ImportEntity): Promise<string> {
    // Templates aligned with the actual schema in shared/schema.ts as of
    // round-13 audit. Prior templates included fields that don't exist on
    // the current tables (materials.category, materials.currentPrice,
    // suppliers.location, etc.), making every "follow the template" import
    // fail 100% of rows. If you change the materials/suppliers/skus
    // schemas, this generator + mapRecordToEntity above MUST be updated
    // together — they're the import contract.
    const templates: Record<ImportEntity, string[]> = {
      skus: [
        'code,name,priority',
        'SKU001,Widget A,1',
        'SKU002,Widget B,2',
      ],
      materials: [
        'code,name,unit,onHand,inbound',
        'STEEL-CS,Carbon Steel Plate,kg,5000,1000',
        'AL-6061,Aluminum 6061 Rod,kg,3000,500',
      ],
      suppliers: [
        'name,contactEmail,materialCategories',
        'ABC Manufacturing,contact@abc.com,"raw_metals,fasteners"',
        'XYZ Suppliers,info@xyz.com,packaging',
      ],
    };

    return templates[entity].join('\n');
  }
}
