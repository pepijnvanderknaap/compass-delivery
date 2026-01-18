require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAuth() {
  // Try to sign in with demo credentials
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@compass.com',
    password: 'password123',
  });
  
  if (error) {
    console.log('❌ Login failed:', error.message);
    console.log('\nThe demo user does NOT exist in Supabase Auth.');
    console.log('You need to create it in the Supabase dashboard.');
  } else {
    console.log('✅ Login successful!');
    console.log('User:', data.user.email);
  }
}

checkAuth();
