const { supabase } = require('../../config/db');
const { getSignedUrl, PROOF_BUCKET } = require('../utils/storage');

function normalizeItem(row) {
  if (!row) return null;
  return {
    ...row,
    finder_name: row.finder?.full_name || null,
    finder: undefined
  };
}

function normalizeLostReport(row) {
  if (!row) return null;
  return {
    ...row,
    reporter_name: row.reporter?.full_name || null,
    reporter_email: row.reporter?.email || null,
    reporter: undefined
  };
}

function normalizeClaim(row) {
  if (!row) return null;
  return {
    ...row,
    claimant_name: row.claimant?.full_name || null,
    claimant_email: row.claimant?.email || null,
    claimant: undefined
  };
}

const itemSelect = `
  id, item_name, description, category, location_found,
  date_found, status, item_source, image_path, found_by, created_at, updated_at,
  finder:users!found_items_found_by_fkey(full_name)
`;

async function searchFoundItems({ keyword = '', category = '', status = 'found' }) {
  let query = supabase
    .from('found_items')
    .select(itemSelect)
    .order('created_at', { ascending: false })
    .limit(200);

  const cleanKeyword = keyword.trim().replace(/[(),]/g, ' ');
  if (cleanKeyword) {
    query = query.or(`item_name.ilike.%${cleanKeyword}%,description.ilike.%${cleanKeyword}%,location_found.ilike.%${cleanKeyword}%`);
  }
  if (category.trim()) query = query.eq('category', category.trim());
  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeItem);
}

async function findById(id) {
  const { data, error } = await supabase
    .from('found_items')
    .select(itemSelect)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return normalizeItem(data);
}

async function createFoundItem(data) {
  const { data: row, error } = await supabase
    .from('found_items')
    .insert({
      item_name: data.item_name,
      description: data.description,
      category: data.category,
      location_found: data.location_found,
      date_found: data.date_found,
      status: 'found',
      item_source: data.item_source || 'found',
      image_path: data.image_path || null,
      found_by: data.found_by || null
    })
    .select(itemSelect)
    .single();
  if (error) throw error;
  return normalizeItem(row);
}

async function updateFoundItem(id, data) {
  const update = {
    item_name: data.item_name,
    description: data.description,
    category: data.category,
    location_found: data.location_found,
    date_found: data.date_found,
    status: data.status,
    updated_at: new Date().toISOString()
  };
  if (data.image_path) update.image_path = data.image_path;

  const { data: current, error: currentError } = await supabase
    .from('found_items')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;
  if (current.status === 'claimed' && data.status !== 'claimed') {
    throw new Error('Claimed items cannot be changed to another status.');
  }

  const { data: row, error } = await supabase
    .from('found_items')
    .update(update)
    .eq('id', id)
    .select(itemSelect)
    .maybeSingle();
  if (error) throw error;
  return normalizeItem(row);
}

async function updateFoundItemStatus(id, status) {
  const { data: current, error: currentError } = await supabase
    .from('found_items')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;
  if (current.status === 'claimed' && status !== 'claimed') {
    throw new Error('Claimed items cannot be changed to another status.');
  }

  const { data: row, error } = await supabase
    .from('found_items')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(itemSelect)
    .maybeSingle();
  if (error) throw error;
  return normalizeItem(row);
}

async function markItemFound(id) {
  return updateFoundItemStatus(id, 'found');
}

async function reportItemFoundByUser(id, { location_found, date_found, user_id }) {
  const { data: current, error: currentError } = await supabase
    .from('found_items')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) return null;

  if (current.status === 'claimed') {
    throw new Error('Claimed items cannot be changed to another status.');
  }
  if (current.status !== 'unfound') {
    throw new Error('Only Unfound items can be reported as Found.');
  }

  const { data: row, error } = await supabase
    .from('found_items')
    .update({
      status: 'found',
      location_found,
      date_found,
      found_by: user_id || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('status', 'unfound')
    .select(itemSelect)
    .maybeSingle();
  if (error) throw error;
  return normalizeItem(row);
}


async function deleteFoundItem(id) {
  const { data: item, error: readError } = await supabase
    .from('found_items')
    .select('image_path')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw readError;
  if (!item) return null;

  const { error } = await supabase.from('found_items').delete().eq('id', id);
  if (error) throw error;
  return item.image_path || null;
}

async function getCategories() {
  const { data, error } = await supabase
    .from('found_items')
    .select('category')
    .not('category', 'is', null)
    .order('category');
  if (error) throw error;
  return [...new Set((data || []).map(row => row.category).filter(Boolean))];
}

async function createLostReport(data) {
  const { data: row, error } = await supabase
    .from('lost_reports')
    .insert({
      user_id: data.user_id,
      item_name: data.item_name,
      description: data.description,
      category: data.category,
      last_seen_location: data.last_seen_location,
      date_lost: data.date_lost,
      contact_info: data.contact_info,
      image_path: data.image_path || null,
      status: 'open'
    })
    .select('*')
    .single();
  if (error) throw error;
  return row;
}

async function getLostReportsByUser(userId) {
  const { data, error } = await supabase
    .from('lost_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getLostReportsForAdmin(status = 'all') {
  let query = supabase
    .from('lost_reports')
    .select(`
      id, user_id, item_name, description, category, last_seen_location,
      date_lost, contact_info, image_path, status, created_at, updated_at,
      reporter:users!lost_reports_user_id_fkey(full_name,email)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeLostReport);
}

async function reviewLostReport(id, decision, reviewerId) {
  const { data, error } = await supabase.rpc('review_lost_report', {
    p_report_id: Number(id),
    p_decision: decision,
    p_reviewer_id: Number(reviewerId)
  });
  if (error) throw error;
  return data;
}

async function createClaim({ item_id, user_id, message, proof_image_path }) {
  const { data: existing, error: existingError } = await supabase
    .from('claims')
    .select('id')
    .eq('item_id', item_id)
    .eq('user_id', user_id)
    .eq('status', 'pending')
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.length) throw new Error('You already have a pending claim for this item.');

  const { data, error } = await supabase
    .from('claims')
    .insert({ item_id, user_id, message, proof_image_path: proof_image_path || null, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function getClaimsForAdmin(status = 'all') {
  let query = supabase
    .from('claims')
    .select(`
      id, item_id, user_id, message, proof_image_path, status, reviewed_by, reviewed_at, created_at,
      item:found_items!claims_item_id_fkey(item_name,category,status),
      claimant:users!claims_user_id_fkey(full_name,email)
    `)
    .order('created_at', { ascending: false });

  if (status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  const normalized = (data || []).map(row => ({
    id: row.id,
    item_id: row.item_id,
    user_id: row.user_id,
    message: row.message,
    proof_image_path: row.proof_image_path,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    item_name: row.item?.item_name || '',
    category: row.item?.category || '',
    item_status: row.item?.status || '',
    claimant_name: row.claimant?.full_name || '',
    claimant_email: row.claimant?.email || ''
  }));

  await Promise.all(normalized.map(async claim => {
    if (!claim.proof_image_path) return;
    try {
      claim.proof_image_path = await getSignedUrl(claim.proof_image_path, 60 * 60, PROOF_BUCKET);
    } catch (signedError) {
      console.warn('Could not create claim proof URL:', signedError.message);
      claim.proof_image_path = null;
    }
  }));

  return normalized;
}

async function updateClaim(id, status, adminId) {
  const { data, error } = await supabase.rpc('review_claim', {
    p_claim_id: Number(id),
    p_status: status,
    p_reviewer_id: Number(adminId)
  });
  if (error) throw error;
  return data;
}

async function markItemUnfound(id) {
  return updateFoundItemStatus(id, 'unfound');
}

async function getDashboardStats() {
  const { data: itemRows, error: itemError } = await supabase.from('found_items').select('status');
  if (itemError) throw itemError;
  const items = itemRows || [];
  const itemStats = {
    total_items: items.length,
    found_items: items.filter(x => x.status === 'found').length,
    claimed_items: items.filter(x => x.status === 'claimed').length,
    unfound_items: items.filter(x => x.status === 'unfound').length
  };

  const { data: lostRows, error: lostError } = await supabase.from('lost_reports').select('status');
  if (lostError) throw lostError;
  const lost = {
    total_lost: (lostRows || []).length,
    open_lost: (lostRows || []).filter(x => x.status === 'open').length
  };

  const { data: claimRows, error: claimError } = await supabase.from('claims').select('status');
  if (claimError) throw claimError;
  const claims = {
    total_claims: (claimRows || []).length,
    pending_claims: (claimRows || []).filter(x => x.status === 'pending').length
  };

  const { data: categoryRows, error: categoryError } = await supabase.from('found_items').select('category');
  if (categoryError) throw categoryError;
  const counts = new Map();
  for (const row of categoryRows || []) counts.set(row.category, (counts.get(row.category) || 0) + 1);
  const categories = [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return { items: itemStats, lost, claims, categories };
}

async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

module.exports = {
  searchFoundItems,
  findById,
  createFoundItem,
  updateFoundItem,
  updateFoundItemStatus,
  deleteFoundItem,
  getCategories,
  createLostReport,
  getLostReportsByUser,
  getLostReportsForAdmin,
  reviewLostReport,
  createClaim,
  getClaimsForAdmin,
  updateClaim,
  markItemUnfound,
  markItemFound,
  reportItemFoundByUser,
  getDashboardStats,
  getNotifications
};
