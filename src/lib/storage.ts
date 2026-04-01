import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Extract the storage file path from a stored URL or path.
 * Handles both full public URLs and plain file paths.
 */
function extractPath(bucket: string, storedValue: string): string | null {
  if (!storedValue) return null;
  
  // If it's already a plain path (no http), return as-is
  if (!storedValue.startsWith("http")) return storedValue;
  
  // Extract path from public URL pattern: .../storage/v1/object/public/{bucket}/{path}
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = storedValue.indexOf(marker);
  if (idx !== -1) return decodeURIComponent(storedValue.substring(idx + marker.length));
  
  return null;
}

/**
 * Create a signed URL for a private bucket file.
 * Falls back to original URL if path extraction fails.
 * @param bucket - The storage bucket name
 * @param storedValue - Either a full public URL or a file path
 * @param expiresIn - Seconds until the signed URL expires (default 1 hour)
 */
export async function getSignedUrl(
  bucket: string,
  storedValue: string,
  expiresIn = 3600
): Promise<string> {
  if (!storedValue) return storedValue;
  
  const path = extractPath(bucket, storedValue);
  if (!path) return storedValue; // Can't extract, return original
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error || !data?.signedUrl) {
    console.warn(`Failed to create signed URL for ${bucket}/${path}:`, error);
    return storedValue; // Fallback
  }
  
  return data.signedUrl;
}

/**
 * Detect which private bucket a URL belongs to, if any.
 */
const PRIVATE_BUCKETS = ["chat-media", "ponto-selfies"];

export function detectPrivateBucket(url: string): string | null {
  if (!url || !url.startsWith("http")) return null;
  for (const bucket of PRIVATE_BUCKETS) {
    if (url.includes(`/storage/v1/object/public/${bucket}/`)) return bucket;
  }
  return null;
}

/**
 * If the URL belongs to a private bucket, return a signed URL. Otherwise return as-is.
 */
export async function resolveMediaUrl(storedUrl: string): Promise<string> {
  const bucket = detectPrivateBucket(storedUrl);
  if (!bucket) return storedUrl;
  return getSignedUrl(bucket, storedUrl);
}
