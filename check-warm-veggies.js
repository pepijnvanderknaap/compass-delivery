const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWarmVeggies() {
  const { data, error } = await supabase
    .from('warm_veggie_combinations')
    .select('id, custom_name, category, description')
    .order('custom_name');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Warm Veggie Combinations:');
    console.table(data);
  }
}

checkWarmVeggies();
