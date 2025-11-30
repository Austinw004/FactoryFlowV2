import { getUncachableStripeClient } from '../server/stripeClient';

const SUBSCRIPTION_TIERS = [
  {
    name: 'Starter',
    description: 'Perfect for small manufacturers getting started with AI-powered allocation intelligence',
    metadata: {
      tier: 'starter',
      order: '1',
      features: JSON.stringify([
        'Up to 100 SKUs',
        'Basic demand forecasting',
        'Economic regime monitoring',
        '5 supplier connections',
        'Email support',
        'Standard reports',
      ]),
      maxSkus: '100',
      maxSuppliers: '5',
      maxUsers: '3',
    },
    monthlyPrice: 4900, // $49.00
    yearlyPrice: 47000, // $470.00 (20% savings)
  },
  {
    name: 'Professional',
    description: 'For growing manufacturers who need advanced forecasting and multi-tier visibility',
    metadata: {
      tier: 'professional',
      order: '2',
      features: JSON.stringify([
        'Up to 1,000 SKUs',
        'Multi-horizon forecasting',
        'FDR-based procurement signals',
        '25 supplier connections',
        'ERP integration',
        'Priority support',
        'Custom dashboards',
        'API access',
      ]),
      maxSkus: '1000',
      maxSuppliers: '25',
      maxUsers: '10',
      popular: 'true',
    },
    monthlyPrice: 19900, // $199.00
    yearlyPrice: 190800, // $1,908.00 (20% savings)
  },
  {
    name: 'Enterprise',
    description: 'Complete platform for large manufacturers with unlimited capacity and dedicated support',
    metadata: {
      tier: 'enterprise',
      order: '3',
      features: JSON.stringify([
        'Unlimited SKUs',
        'Real-time digital twin',
        'Multi-tier supplier mapping',
        'Unlimited supplier connections',
        'Custom ERP integrations',
        'Dedicated account manager',
        'Custom model training',
        'SLA guarantee',
        'On-premise deployment option',
        'Advanced security features',
      ]),
      maxSkus: 'unlimited',
      maxSuppliers: 'unlimited',
      maxUsers: 'unlimited',
    },
    monthlyPrice: 49900, // $499.00
    yearlyPrice: 479000, // $4,790.00 (20% savings)
  },
];

async function seedProducts() {
  console.log('Starting product seeding...');
  
  const stripe = await getUncachableStripeClient();

  for (const tier of SUBSCRIPTION_TIERS) {
    console.log(`\nProcessing ${tier.name} tier...`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `name:'${tier.name}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      console.log(`  Product "${tier.name}" already exists, updating...`);
      product = await stripe.products.update(existingProducts.data[0].id, {
        description: tier.description,
        metadata: tier.metadata,
      });
    } else {
      console.log(`  Creating product "${tier.name}"...`);
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: tier.metadata,
      });
    }

    console.log(`  Product ID: ${product.id}`);

    // Check for existing prices
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    const hasMonthly = existingPrices.data.some(
      (p) => p.recurring?.interval === 'month'
    );
    const hasYearly = existingPrices.data.some(
      (p) => p.recurring?.interval === 'year'
    );

    // Create monthly price if not exists
    if (!hasMonthly) {
      console.log(`  Creating monthly price: $${tier.monthlyPrice / 100}/month...`);
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.monthlyPrice,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: {
          tier: tier.metadata.tier,
          interval: 'monthly',
        },
      });
      console.log(`  Monthly Price ID: ${monthlyPrice.id}`);
    } else {
      console.log(`  Monthly price already exists`);
    }

    // Create yearly price if not exists
    if (!hasYearly) {
      console.log(`  Creating yearly price: $${tier.yearlyPrice / 100}/year...`);
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.yearlyPrice,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: {
          tier: tier.metadata.tier,
          interval: 'yearly',
        },
      });
      console.log(`  Yearly Price ID: ${yearlyPrice.id}`);
    } else {
      console.log(`  Yearly price already exists`);
    }
  }

  console.log('\n✅ Product seeding completed!');
}

seedProducts().catch(console.error);
