const { supabase } = require('../../config/db');

async function findByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, password_hash, role, status, created_at')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function createUser({ full_name, email, password_hash, role = 'student' }) {
  const { data, error } = await supabase
    .from('users')
    .insert({ full_name, email, password_hash, role, status: 'active' })
    .select('id, full_name, email, role, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function updateProfile(id, full_name, email) {
  const { data, error } = await supabase
    .from('users')
    .update({ full_name, email, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, full_name, email, role, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function updateRole(id, role) {
  const { data, error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, full_name, email, role, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function updateStatus(id, status) {
  const { data, error } = await supabase
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, full_name, email, role, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, status, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

module.exports = { findByEmail, findById, createUser, updateProfile, updateRole, updateStatus, getAllUsers };
