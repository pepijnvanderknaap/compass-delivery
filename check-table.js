const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTable() {
  console.log('Checking if warm_veggie_components table exists...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('warm_veggie_components')
      .select('*')
      .limit(5);

    if (error) {
      console.log('❌ Error:', error.message);
      console.log('Code:', error.code);
      console.log('\nThe table might not exist or there might be a permissions issue.');
    } else {
      console.log('✅ Table exists!');
      console.log('Sample data (first 5 rows):');
      console.log(JSON.stringify(data, null, 2));
      console.log(`\nTotal rows found: ${data.length}`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTable();
