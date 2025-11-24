import type { IStorage } from "../storage";
import type { InsertBenchmarkAggregate } from "@shared/schema";

/**
 * Benchmark Aggregation Service
 * Periodically aggregates anonymized cost data from all companies
 * to create industry benchmarks with privacy safeguards
 */

interface MaterialGroup {
  category: string;
  subcategory: string | null;
  name: string;
  unit: string;
}

export class BenchmarkAggregationService {
  private storage: IStorage;
  private MIN_PARTICIPANTS = 3; // Minimum companies required for privacy

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Aggregate all benchmark submissions into industry averages
   * Runs monthly to update benchmark data
   */
  async aggregateAll(): Promise<{ processed: number; aggregates: number }> {
    try {
      console.log("[Benchmark Aggregation] Starting aggregation process...");
      
      const companies = await this.storage.getAllCompanyIds();
      console.log(`[Benchmark Aggregation] Found ${companies.length} companies`);

      // Get all submissions
      let allSubmissions = [];
      for (const companyId of companies) {
        const submissions = await this.storage.getBenchmarkSubmissions(companyId);
        allSubmissions.push(...submissions);
      }

      console.log(`[Benchmark Aggregation] Total submissions: ${allSubmissions.length}`);

      if (allSubmissions.length === 0) {
        console.log("[Benchmark Aggregation] No submissions found, skipping aggregation");
        return { processed: 0, aggregates: 0 };
      }

      // Group submissions by material, industry, company size, region
      const groups = this.groupSubmissions(allSubmissions);
      console.log(`[Benchmark Aggregation] Created ${groups.size} material groups`);

      // Calculate aggregates for each group
      let aggregatesCreated = 0;
      const currentMonth = this.getCurrentMonth();

      for (const [groupKey, submissions] of groups.entries()) {
        if (submissions.length < this.MIN_PARTICIPANTS) {
          console.log(`[Benchmark Aggregation] Skipping group ${groupKey} - only ${submissions.length} participants (min: ${this.MIN_PARTICIPANTS})`);
          continue;
        }

        const aggregate = this.calculateAggregate(submissions, currentMonth);
        
        // Create or update aggregate
        try {
          await this.storage.createBenchmarkAggregate(aggregate);
          aggregatesCreated++;
          console.log(`[Benchmark Aggregation] Created aggregate for ${groupKey}`);
        } catch (error: any) {
          // If aggregate already exists, update it
          if (error.message?.includes("unique")) {
            console.log(`[Benchmark Aggregation] Aggregate exists for ${groupKey}, skipping`);
          } else {
            console.error(`[Benchmark Aggregation] Error creating aggregate:`, error);
          }
        }
      }

      console.log(`[Benchmark Aggregation] Completed: ${aggregatesCreated} aggregates created/updated`);
      return { processed: allSubmissions.length, aggregates: aggregatesCreated };
    } catch (error) {
      console.error("[Benchmark Aggregation] Fatal error:", error);
      throw error;
    }
  }

  /**
   * Group submissions by material category, industry, company size, and region
   */
  private groupSubmissions(submissions: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const submission of submissions) {
      if (!submission.shareConsent) continue; // Respect opt-out

      // Create multiple group keys for different segmentation levels
      const groupKeys = [
        // Global average (all companies, all sizes)
        `${submission.materialCategory}|${submission.materialSubcategory || ""}|${submission.materialName}|${submission.unit}|||`,
        
        // Industry-specific
        `${submission.materialCategory}|${submission.materialSubcategory || ""}|${submission.materialName}|${submission.unit}|${submission.companyIndustry || ""}||`,
        
        // Company size-specific
        `${submission.materialCategory}|${submission.materialSubcategory || ""}|${submission.materialName}|${submission.unit}||${submission.companySize || ""}|`,
        
        // Region-specific
        `${submission.materialCategory}|${submission.materialSubcategory || ""}|${submission.materialName}|${submission.unit}|||${submission.companyLocation || ""}`,
        
        // Industry + Size combination
        `${submission.materialCategory}|${submission.materialSubcategory || ""}|${submission.materialName}|${submission.unit}|${submission.companyIndustry || ""}|${submission.companySize || ""}|`,
      ];

      for (const key of groupKeys) {
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(submission);
      }
    }

    return groups;
  }

  /**
   * Calculate aggregate statistics for a group of submissions
   */
  private calculateAggregate(submissions: any[], snapshotMonth: string): InsertBenchmarkAggregate {
    const costs = submissions.map(s => s.unitCost).sort((a, b) => a - b);
    const volumes = submissions.map(s => s.purchaseVolume || 0);
    
    // Basic statistics
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    const median = costs[Math.floor(costs.length / 2)];
    const min = costs[Math.floor(costs.length * 0.05)]; // 5th percentile for privacy
    const max = costs[Math.floor(costs.length * 0.95)]; // 95th percentile for privacy
    
    // Percentiles
    const p25 = costs[Math.floor(costs.length * 0.25)];
    const p75 = costs[Math.floor(costs.length * 0.75)];
    const p90 = costs[Math.floor(costs.length * 0.90)];
    
    // Standard deviation
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avg, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);
    
    // Volume-weighted average
    const totalVolume = volumes.reduce((a, b) => a + b, 0);
    const volumeWeightedAvg = totalVolume > 0
      ? submissions.reduce((sum, s) => sum + (s.unitCost * (s.purchaseVolume || 0)), 0) / totalVolume
      : avg;
    
    // Parse group key to extract segmentation
    const sample = submissions[0];
    const [category, subcategory, name, unit, industry, companySize, region] = [
      sample.materialCategory,
      sample.materialSubcategory,
      sample.materialName,
      sample.unit,
      sample.companyIndustry,
      sample.companySize,
      sample.companyLocation,
    ];

    // Data quality score (higher is better)
    const verifiedCount = submissions.filter(s => s.dataQuality === "verified").length;
    const dataQualityScore = (verifiedCount / submissions.length) * 100;

    return {
      materialCategory: category,
      materialSubcategory: subcategory || null,
      materialName: name,
      unit,
      industry: industry || null,
      companySize: companySize || null,
      region: region || null,
      participantCount: submissions.length,
      averageCost: avg,
      medianCost: median,
      minCost: min,
      maxCost: max,
      standardDeviation: stdDev,
      p25Cost: p25,
      p75Cost: p75,
      p90Cost: p90,
      volumeWeightedAvgCost: volumeWeightedAvg,
      totalVolume,
      snapshotMonth,
      dataQualityScore,
      isPublished: 1, // Auto-publish if meets privacy threshold
    };
  }

  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  /**
   * Auto-submit benchmark data for a company based on their supplier materials
   */
  async autoSubmitFromSupplierMaterials(companyId: string): Promise<number> {
    try {
      const company = await this.storage.getCompany(companyId);
      if (!company) return 0;

      const suppliers = await this.storage.getSuppliers(companyId);
      let submitted = 0;

      for (const supplier of suppliers) {
        const supplierMaterials = await this.storage.getSupplierMaterials(supplier.id);
        
        for (const sm of supplierMaterials) {
          const material = await this.storage.getMaterial(sm.materialId);
          if (!material) continue;

          // Extract category from material name or code (simplified)
          const category = this.extractCategory(material.name, material.code);
          
          try {
            await this.storage.createBenchmarkSubmission({
              companyId,
              materialCategory: category,
              materialSubcategory: null,
              materialName: material.name,
              unit: material.unit,
              unitCost: sm.unitCost,
              currency: "USD",
              purchaseVolume: sm.minimumOrderQuantity,
              volumePeriod: "monthly",
              companyIndustry: company.industry || null,
              companySize: company.companySize || null,
              companyLocation: company.location || null,
              snapshotDate: new Date().toISOString(),
              dataQuality: "verified",
              shareConsent: 1,
            });
            submitted++;
          } catch (error) {
            // Submission may already exist, skip
            console.log(`[Benchmark] Skipping duplicate submission for ${material.name}`);
          }
        }
      }

      return submitted;
    } catch (error) {
      console.error(`[Benchmark] Error auto-submitting for company ${companyId}:`, error);
      return 0;
    }
  }

  /**
   * Simple category extraction from material name/code
   */
  private extractCategory(name: string, code: string): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes("aluminum") || nameLower.includes("aluminium") || nameLower.includes("steel") || nameLower.includes("copper") || nameLower.includes("metal")) {
      return "Metals";
    } else if (nameLower.includes("plastic") || nameLower.includes("polymer") || nameLower.includes("resin")) {
      return "Polymers";
    } else if (nameLower.includes("electronic") || nameLower.includes("circuit") || nameLower.includes("chip")) {
      return "Electronics";
    } else if (nameLower.includes("chemical") || nameLower.includes("solvent")) {
      return "Chemicals";
    } else {
      return "Other";
    }
  }
}

export function createBenchmarkAggregationService(storage: IStorage): BenchmarkAggregationService {
  return new BenchmarkAggregationService(storage);
}
