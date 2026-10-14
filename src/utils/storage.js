const { supabase } = require('../../config/db');

const ITEM_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'item-images';
const PROOF_BUCKET = process.env.SUPABASE_PROOF_BUCKET || 'claim-proofs';

function sanitizeFileName(name) {
  return String(name || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
}

function extensionFromMime(type) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  return map[type] || 'bin';
}

async function uploadImage(file, folder, bucket = ITEM_BUCKET) {
  if (!file) return null;

  const timestamp = Date.now();
  const safeName = sanitizeFileName(file.originalname);
  const extension = extensionFromMime(file.mimetype);
  const base = safeName.replace(/\.[^.]+$/, '');
  const fileName = `${base}-${timestamp}.${extension}`;
  const storagePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });
  if (error) throw error;

  if (bucket === PROOF_BUCKET) return { path: storagePath, bucket };

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return { url: data.publicUrl, path: storagePath, bucket };
}

function extractStoragePath(publicUrl, bucket = ITEM_BUCKET) {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

async function getSignedUrl(storagePath, expiresIn = 60 * 60, bucket = PROOF_BUCKET) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

async function deleteImage(value, bucket = ITEM_BUCKET) {
  if (!value) return;
  const storagePath = bucket === PROOF_BUCKET ? value : extractStoragePath(value, bucket);
  if (!storagePath) return;

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) console.warn(`Could not delete ${bucket} image:`, error.message);
}

module.exports = {
  uploadImage,
  deleteImage,
  extractStoragePath,
  getSignedUrl,
  ITEM_BUCKET,
  PROOF_BUCKET
};
