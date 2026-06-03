require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing from environment variables.');
  process.exit(1);
}
if (!key.startsWith('eyJ')) {
  console.error('FATAL: SUPABASE_SERVICE_KEY appears to be in the wrong format.');
  console.error('Go to Supabase Dashboard → Project Settings → API → service_role key (JWT, starts with eyJ).');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
