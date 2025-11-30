import { getUncachableStripeClient } from '../server/stripeClient';

const SUBSCRIPTION_TIERS = [
  {
    name: 'Starter',
    description: 'For growing manufacturers getting started with intelligent allocation',
    metadata: {
      tier: 'starter',
      order: '1',
      features: JSON.stringify([
        'Up to 100 SKUs',
        '5 users included',
        'Core demand forecasting',
        'Market condition signals',
        '5 supplier connections',
        'Email support',
        'Monthly market reports',
      ]),
      maxSkus: '100',
      maxSuppliers: '5',
      maxUsers: '5',
    },
    monthlyPrice: 29900, // $299.00
    yearlyPrice: 287000, // $2,870.00 (20% savings, ~$239/month)
  },
  {
    name: 'Professional',
    description: 'For established operations needing advanced forecasting and integrations',
    metadata: {
      tier: 'professional',
      order: '2',
      features: JSON.stringify([
        'Up to 1,000 SKUs',
        '25 users included',
        'Advanced multi-horizon forecasting',
        'Real-time market signals',
        '25 supplier connections',
        'ERP integration (SAP, Oracle, Dynamics)',
        'Supplier risk scoring',
        'Priority support (4hr response)',
        'Custom dashboards',
        'API access',
      ]),
      maxSkus: '1000',
      maxSuppliers: '25',
      maxUsers: '25',
      popular: 'true',
    },
    monthlyPrice: 79900, // $799.00
    yearlyPrice: 767000, // $7,670.00 (20% savings, ~$639/month)
  },
  {
    name: 'Enterprise',
    description: 'Complete platform for large-scale operations with unlimited capacity',
    metadata: {
      tier: 'enterprise',
      order: '3',
      features: JSON.stringify([
        'Unlimited SKUs',
        'Unlimited users',
        'Real-time digital twin',
        'Multi-tier supplier mapping',
        'Unlimited supplier connections',
        'Custom ERP integrations',
        'Dedicated account manager',
        'Custom model training',
        'SLA guarantee (99.9% uptime)',
        'On-premise deployment option',
        'Advanced security & compliance',
        'Quarterly business reviews',
      ]),
      maxSkus: 'Unlimited',
      maxSuppliers: 'Unlimited',
      maxUsers: 'Unlimited',
    },
    monthlyPrice: 199900, // $1,999.00 (shown as Custom on website)
    yearlyPrice: 1919000, // $19,190.00 (20% savings)
  },
];

async function seedProducts() {
  console.log('Starting product seeding with updated pricing...');
  
  const stripe = await getUncachableStripeClient();

  for (const tier of SUBSCRIPTION_TIERS) {
    console.log(`\nProcessing ${tier.name} tier...`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `name:'${tier.name}'`,
    });

    let product;
    if (existingProducts.data.length > 0) {
      console.log(`  Product "${tier.name}" already exists, updating metadata...`);
      product = await stripe.products.update(existingProducts.data[0].id, {
        description: tier.description,
        metadata: tier.metadata,
      });
      
      // Archive old prices
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
      });
      
      for (const price of existingPrices.data) {
        console.log(`  Archiving old price: ${price.id} ($${price.unit_amount! / 100})`);
        await stripe.prices.update(price.id, { active: false });
      }
    } else {
      console.log(`  Creating product "${tier.name}"...`);
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: tier.metadata,
      });
    }

    console.log(`  Product ID: ${product.id}`);

    // Create new monthly price
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

    // Create new yearly price
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
  }

  console.log('\n✅ Product seeding completed with new pricing!');
  console.log('\nNew Pricing Summary:');
  console.log('  Starter:      $299/month  ($239/month billed annually)');
  console.log('  Professional: $799/month  ($639/month billed annually)');
  console.log('  Enterprise:   Custom pricing (contact sales)');
}

seedProducts().catch(console.error);
