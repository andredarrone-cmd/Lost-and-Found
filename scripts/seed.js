const bcrypt = require('bcryptjs');
const { supabase, testConnection } = require('../config/db');

async function upsertUser(full_name, email, password, role) {
  const password_hash = await bcrypt.hash(password, 12);
  const { data: existing, error: findError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (findError) throw findError;

  if (existing) {
    const { error } = await supabase
      .from('users')
      .update({ full_name, password_hash, role, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('users')
      .insert({ full_name, email, password_hash, role, status: 'active' });
    if (error) throw error;
  }
}

(async () => {
  try {
    await testConnection();
    await upsertUser('System Administrator', 'admin@lostfound.local', 'Admin@12345', 'admin');
    await upsertUser('Front Desk Staff', 'staff@lostfound.local', 'Staff@12345', 'staff');
    await upsertUser('Demo Student', 'student@lostfound.local', 'Student@12345', 'student');

    console.log('\nSeed complete.\n');
    console.log('Admin:   admin@lostfound.local / Admin@12345');
    console.log('Staff:   staff@lostfound.local / Staff@12345');
    console.log('Student: student@lostfound.local / Student@12345\n');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  }
})();
