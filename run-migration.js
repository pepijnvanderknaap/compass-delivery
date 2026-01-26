const https = require('https');
const fs = require('fs');

const projectRef = 'agwheuqqvdtcaqpgviya';
const serviceRoleKey = 'sb_secret_05NvpSThy4sDwYh7UH83Kw_5hxDdIUq';

// Read the migration SQL
const migrationSQL = fs.readFileSync('./supabase/migrations/20260122_create_warm_veggie_components.sql', 'utf8');

console.log('Attempting to run migration via Supabase Edge Functions API...\n');
console.log('Migration SQL:');
console.log(migrationSQL);
console.log('\n---\n');

// Construct the request to execute SQL
const data = JSON.stringify({
  query: migrationSQL
});

const options = {
  hostname: `${projectRef}.supabase.co`,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', responseData);

    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('\n✅ Migration might have succeeded!');
    } else {
      console.log('\n❌ Migration failed. You may need to run this SQL manually in Supabase Dashboard.');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\nPlease run the migration manually in Supabase Dashboard SQL Editor.');
});

req.write(data);
req.end();
