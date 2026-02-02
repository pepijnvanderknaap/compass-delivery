import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

dotenv.config({ path: join(projectRoot, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

console.log('=== SEEDING BANQUETING ITEMS ===\n');

const sampleItems = [
  // Breakfast
  {
    name: 'Continental Breakfast Platter',
    description: 'Assorted croissants, pain au chocolat, danish pastries with butter and jam',
    category: 'breakfast',
    price: 12.50,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Coffee & Tea Trolley',
    description: 'Fresh coffee, selection of teas, milk, sugar, cups',
    category: 'breakfast',
    price: 75.00,
    unit: 'serves 15-20 people',
    requires_quote: false,
  },
  {
    name: 'Fresh Fruit Platter',
    description: 'Seasonal fruit selection, beautifully arranged',
    category: 'breakfast',
    price: 45.00,
    unit: 'per platter (serves 10)',
    requires_quote: false,
  },

  // Coffee, Tea & Snacks
  {
    name: 'Coffee Station',
    description: 'Premium coffee, various syrups, milk options',
    category: 'coffee_tea_snacks',
    price: 3.50,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Afternoon Tea Package',
    description: 'Selection of teas, mini sandwiches, scones with clotted cream and jam, petit fours',
    category: 'coffee_tea_snacks',
    price: 18.50,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Snack Box',
    description: 'Mixed nuts, energy bars, fruit, chocolate',
    category: 'coffee_tea_snacks',
    price: 8.00,
    unit: 'per box',
    requires_quote: false,
  },

  // Lunch & Dinners
  {
    name: 'Sandwich Platter',
    description: 'Assorted sandwiches: chicken, tuna, vegetarian options',
    category: 'lunch_dinner',
    price: 11.50,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Hot Lunch Buffet',
    description: 'Choice of 2 hot dishes, rice/pasta, vegetables, salad',
    category: 'lunch_dinner',
    price: 22.00,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Executive Board Lunch',
    description: 'Premium 3-course meal with wine pairing',
    category: 'lunch_dinner',
    price: 0,
    unit: 'custom quote',
    requires_quote: true,
  },

  // Borrel
  {
    name: 'Classic Borrel Package',
    description: 'Beer, wine, soft drinks with bitterballen, cheese, olives',
    category: 'borrel',
    price: 16.50,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Premium Borrel Package',
    description: 'Champagne, premium wines, cocktails, extensive finger food selection',
    category: 'borrel',
    price: 28.00,
    unit: 'per person',
    requires_quote: false,
  },
  {
    name: 'Cocktail Bar Service',
    description: 'Professional bartender, premium spirits, fresh ingredients',
    category: 'borrel',
    price: 0,
    unit: 'custom quote',
    requires_quote: true,
  },
];

const { data, error } = await supabase
  .from('banqueting_items')
  .insert(sampleItems)
  .select();

if (error) {
  console.error('Error seeding items:', error);
} else {
  console.log(`✅ Successfully seeded ${data.length} banqueting items`);
  console.log('\nItems by category:');
  const byCategory = data.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} items`);
  });
}
