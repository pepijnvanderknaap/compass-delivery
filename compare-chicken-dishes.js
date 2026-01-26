const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function compareDishes() {
  const { data: chickenTest } = await supabase
    .from('dishes')
    .select('name, portion_size, default_portion_size_g, default_portion_size_ml')
    .ilike('name', '%Chicken Test%')
    .maybeSingle();

  if (chickenTest) {
    console.log('Chicken Test:');
    console.log('  portion_size:', chickenTest.portion_size, 'g');
    console.log('  default_portion_size_g:', chickenTest.default_portion_size_g, 'g');
    console.log('  default_portion_size_ml:', chickenTest.default_portion_size_ml, 'ml');
  } else {
    console.log('Chicken Test: NOT FOUND');
  }

  console.log('');

  const { data: chickenBiryani } = await supabase
    .from('dishes')
    .select('name, portion_size, default_portion_size_g, default_portion_size_ml')
    .ilike('name', '%Chicken Biryani%')
    .single();

  console.log('Chicken Biryani:');
  console.log('  portion_size:', chickenBiryani.portion_size, 'g');
  console.log('  default_portion_size_g:', chickenBiryani.default_portion_size_g, 'g');
  console.log('  default_portion_size_ml:', chickenBiryani.default_portion_size_ml, 'ml');

  console.log('\n=== THE ISSUE ===');
  console.log('Production sheet uses default_portion_size_g if it exists, otherwise falls back to portion_size');
  console.log(`\nChicken Biryani calculation: 65 × ${chickenBiryani.default_portion_size_g}g = ${65 * chickenBiryani.default_portion_size_g / 1000}kg`);

  if (chickenTest) {
    const testPortionSize = chickenTest.default_portion_size_g || chickenTest.portion_size;
    console.log(`Chicken Test calculation: 65 × ${testPortionSize}g = ${65 * testPortionSize / 1000}kg`);
  }
}

compareDishes();
