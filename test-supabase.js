require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  try {
    // Test connection by querying user_profiles table
    const { data, error } = await supabase.from('user_profiles').select('*').limit(5);
    
    if (error) {
      console.log('\n❌ Database tables NOT set up yet!');
      console.log('Error:', error.message);
      console.log('\nYou need to:');
      console.log('1. Go to https://supabase.com/dashboard');
      console.log('2. Open your project SQL editor');
      console.log('3. Run the SQL from supabase-schema.sql');
    } else {
      console.log('\n✅ Database is set up!');
      console.log('Found', data.length, 'user(s)');
      if (data.length > 0) {
        data.forEach(u => console.log(`  - ${u.email} (${u.role})`));
      } else {
        console.log('\n⚠️  No users found. You need to create demo users.');
      }
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

test();
