const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd2hldXFxdmR0Y2FxcGd2aXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MjQwNTAsImV4cCI6MjA4NDMwMDA1MH0.6LR6bflml826wcP9gweEftsLiYyLaMvXBoWzgS-pgPM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllMenus() {
  console.log('\n=== All Weekly Menus ===\n');
  
  const { data: allMenus, error } = await supabase
    .from('weekly_menus')
    .select('*')
    .order('week_start_date', { ascending: false });
  
  if (error) {
    console.error('Error querying weekly_menus:', error);
    return;
  }
  
  console.log(`Found ${allMenus.length} weekly menu(s):\n`);
  
  for (const menu of allMenus) {
    console.log(`ID: ${menu.id}`);
    console.log(`Week Start Date: ${menu.week_start_date}`);
    console.log(`Created At: ${menu.created_at}`);
    console.log(`Updated At: ${menu.updated_at}`);
    console.log('---');
  }
  
  // Check for menus around January 2026
  console.log('\n=== Checking for menus in January 2026 ===\n');
  
  const { data: janMenus, error: janError } = await supabase
    .from('weekly_menus')
    .select('*')
    .gte('week_start_date', '2026-01-01')
    .lte('week_start_date', '2026-01-31')
    .order('week_start_date');
  
  if (janError) {
    console.error('Error:', janError);
    return;
  }
  
  if (janMenus.length === 0) {
    console.log('No weekly menus found for January 2026');
  } else {
    console.log(`Found ${janMenus.length} menu(s) in January 2026:`);
    janMenus.forEach(menu => {
      console.log(`  - Week starting: ${menu.week_start_date} (ID: ${menu.id})`);
    });
  }
}

checkAllMenus().catch(console.error);
