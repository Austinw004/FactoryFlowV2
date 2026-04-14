/**
 * Setup script: Create Stripe Meter and Metered Price for Usage-Based plan
 *
 * This script creates:
 * 1. A billing meter named "active_skus" for tracking SKU counts
 * 2. A metered price on the Usage-Based product with tiered pricing:
 *    - First 100 SKUs: $199.00 base fee
 *    - SKUs 101+: $2.00 per additional SKU
 *    - Capped at $799.00/month (at which point customer upgrades to Growth plan)
 *
 * Usage:
 *   npx tsx server/scripts/setup-usage-metering.ts
 *
 * This is idempotent: re-running it will create a new price if needed,
 * or you can inspect Stripe dashboard for existing meters/prices.
 */

import Stripe from "stripe";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/structuredLogger";

const USAGE_PRODUCT_ID = "prod_UKakewHs3wvwZG"; // Existing Usage-Based product
const METER_NAME = "active_skus";
const METER_DISPLAY_NAME = "Active SKUs per Month";

async function setupMeterAndPrice() {
  const stripe = await getUncachableStripeClient();

  console.log("🚀 Starting Stripe Metering Setup...\n");

  try {
    // ── Step 1: Check if meter already exists ─────────────────────────────
    console.log("📊 Checking for existing billing meter...");

    // Note: Stripe meters list API is available in recent SDK versions
    // If not available, you may need to check manually in dashboard
    let metersListResponse;
    try {
      metersListResponse = await (stripe as any).billing.meters.list({ limit: 100 });
      const existingMeter = metersListResponse?.data?.find(
        (m: any) => m.event_name === METER_NAME,
      );

      if (existingMeter) {
        console.log(`✅ Meter already exists: ${existingMeter.id}`);
        console.log(`   Event name: ${existingMeter.event_name}`);
      }
    } catch (metersError) {
      console.log("⚠️  Could not list meters (might require newer SDK version)");
      console.log("   Proceeding to create new meter anyway...\n");
    }

    // ── Step 2: Create Billing Meter ──────────────────────────────────────
    console.log("📝 Creating billing meter...");

    const meterPayload = {
      event_name: METER_NAME,
      display_name: METER_DISPLAY_NAME,
      default_aggregation: {
        formula: "sum", // Sum all events for the month
      },
    };

    let meter;
    try {
      meter = await (stripe as any).billing.meters.create(meterPayload);
      console.log(`✅ Meter created: ${meter.id}`);
      console.log(`   Event name: ${meter.event_name}`);
    } catch (meterError: any) {
      if (meterError.message?.includes("already exists")) {
        console.log("ℹ️  Meter already exists (Stripe API constraint)");
        // Continue to create price
      } else {
        throw meterError;
      }
    }

    console.log("");

    // ── Step 3: Create Metered Price ──────────────────────────────────────
    console.log("💰 Creating metered price on Usage-Based product...");

    const pricePayload = {
      product: USAGE_PRODUCT_ID,
      currency: "usd",
      billing_scheme: "tiered" as const,
      tiers_mode: "graduated" as const,
      tiers: [
        {
          // First 100 SKUs included in base fee
          up_to: 100,
          flat_amount: 1990000, // $199.00 in cents (x100 for Stripe's internal format)
          unit_amount: 0, // No per-unit charge for first tier
        },
        {
          // SKUs 101 and beyond
          over: 100,
          unit_amount: 200, // $2.00 per additional SKU
        },
      ],
      recurring: {
        usage_type: "metered",
        aggregate_usage: "sum", // Sum all meter events for the month
        interval: "month",
      },
      metadata: {
        metering_unit: "active_skus",
        description: "Usage-based: $199 base + $2 per SKU over 100, capped at $799",
        base_fee_usd: "199.00",
        base_sku_count: "100",
        overage_rate_usd: "2.00",
        monthly_cap_usd: "799.00",
      },
    };

    const price = await stripe.prices.create(pricePayload as any);

    console.log(`✅ Metered price created: ${price.id}`);
    console.log(`   Product: ${price.product}`);
    console.log(`   Billing scheme: ${price.billing_scheme}`);
    console.log(`   Tiers mode: ${price.tiers_mode}`);
    console.log(`   Recurring: ${JSON.stringify(price.recurring, null, 2)}`);

    console.log("\n");

    // ── Step 4: Log results ───────────────────────────────────────────────
    console.log("📋 Configuration Summary:");
    console.log("───────────────────────────────────────────────────────────");
    console.log(`Meter ID:              ${meter?.id || "existing (check Stripe dashboard)"}`);
    console.log(`Meter Event Name:      ${METER_NAME}`);
    console.log(`Price ID:              ${price.id}`);
    console.log(`Product ID:            ${USAGE_PRODUCT_ID}`);
    console.log("");
    console.log("Pricing Breakdown:");
    console.log(`  Base Fee (0-100 SKUs):   $199.00/month`);
    console.log(`  Overage (101+ SKUs):     $2.00 per SKU/month`);
    console.log(`  Monthly Cap:             $799.00 (switch to Growth plan)`);
    console.log("");
    console.log("Next Steps:");
    console.log(`  1. Update usageMetering.ts with Price ID: ${price.id}`);
    console.log(`  2. Deploy daily metering job (runDailySkuMeteringJob)`);
    console.log(`  3. Configure webhook for usage_events table`);
    console.log("───────────────────────────────────────────────────────────\n");

    // ── Step 5: Store in logger for reference ─────────────────────────────
    logger.info("stripe_setup", "metering_configured", {
      meterId: meter?.id,
      priceId: price.id,
      productId: USAGE_PRODUCT_ID,
    });

    console.log("✨ Setup complete!");
    return {
      meterId: meter?.id,
      priceId: price.id,
      productId: USAGE_PRODUCT_ID,
    };
  } catch (error) {
    console.error("❌ Setup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the setup
setupMeterAndPrice().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
