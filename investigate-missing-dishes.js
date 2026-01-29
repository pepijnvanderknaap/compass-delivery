const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agwheuqqvdtcaqpgviya.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnd2hldXFxdmR0Y2FxcGd2aXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MjQwNTAsImV4cCI6MjA4NDMwMDA1MH0.6LR6bflml826wcP9gweEftsLiYyLaMvXBoWzgS-pgPM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateMenu() {
  console.log('\n=== Investigation: Missing dishes for Thursday Jan 22 and Friday Jan 23, 2026 ===\n');
  
  // Jan 22, 2026 is a Thursday
  // The week starts on Monday Jan 19, 2026
  const weekStartDate = '2026-01-19';
  
  console.log('1. Checking for weekly_menus record with week_start_date = 2026-01-19\n');
  
  const { data: weeklyMenus, error: menuError } = await supabase
    .from('weekly_menus')
    .select('*')
    .eq('week_start_date', weekStartDate);
  
  if (menuError) {
    console.error('Error querying weekly_menus:', menuError);
    return;
  }
  
  console.log('Weekly menus found:', JSON.stringify(weeklyMenus, null, 2));
  
  if (!weeklyMenus || weeklyMenus.length === 0) {
    console.log('\n❌ ISSUE FOUND: No weekly_menus record exists for week starting 2026-01-19');
    console.log('This is why dishes are not showing for Thursday Jan 22 and Friday Jan 23, 2026');
    return;
  }
  
  const menuId = weeklyMenus[0].id;
  console.log(`\n2. Checking menu_items for menu_id = ${menuId}, day_of_week IN (3, 4)\n`);
  console.log('   (day_of_week 3 = Thursday, day_of_week 4 = Friday)\n');
  
  const { data: menuItems, error: itemsError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_id', menuId)
    .in('day_of_week', [3, 4]);
  
  if (itemsError) {
    console.error('Error querying menu_items:', itemsError);
    return;
  }
  
  console.log('Menu items found:', JSON.stringify(menuItems, null, 2));
  
  if (!menuItems || menuItems.length === 0) {
    console.log('\n❌ ISSUE FOUND: No menu_items exist for day_of_week 3 (Thursday) or 4 (Friday)');
    console.log('This is why dishes are not showing for those days');
  } else {
    console.log(`\n✓ Found ${menuItems.length} menu items for Thursday/Friday`);
  }
  
  // Also check ALL menu items for this week to see the full picture
  console.log(`\n3. Checking ALL menu_items for menu_id = ${menuId} (all days of the week)\n`);
  
  const { data: allMenuItems, error: allItemsError } = await supabase
    .from('menu_items')
    .select('*')
    .eq('menu_id', menuId)
    .order('day_of_week');
  
  if (allItemsError) {
    console.error('Error querying all menu_items:', allItemsError);
    return;
  }
  
  console.log('All menu items for this week:', JSON.stringify(allMenuItems, null, 2));
  
  // Summary
  console.log('\n=== SUMMARY ===\n');
  console.log('Week start date:', weekStartDate);
  console.log('Weekly menu exists:', weeklyMenus.length > 0);
  console.log('Total menu items for this week:', allMenuItems ? allMenuItems.length : 0);
  
  if (allMenuItems && allMenuItems.length > 0) {
    const daysCovered = [...new Set(allMenuItems.map(item => item.day_of_week))].sort();
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    console.log('Days with menu items:', daysCovered.map(d => `${d} (${dayNames[d]})`).join(', '));
    
    const missingDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !daysCovered.includes(d));
    if (missingDays.length > 0) {
      console.log('Days WITHOUT menu items:', missingDays.map(d => `${d} (${dayNames[d]})`).join(', '));
    }
  }
}

investigateMenu().catch(console.error);
