const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('YOUR-PROJECT-REF')) {
  console.warn('Supabase environment variables are not configured yet. Fill in .env before starting the application.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testConnection() {
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('YOUR-PROJECT-REF')) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
  }

  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) throw error;
  console.log('Supabase connection successful.');
}

module.exports = { supabase, testConnection };
