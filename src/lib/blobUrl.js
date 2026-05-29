const PRIVATE_BLOB_MARKER = '.private.blob.vercel-storage.com/';

export function toBlobProxyUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/api/blob?')) return url;
  if (url.includes(PRIVATE_BLOB_MARKER)) {
    return `/api/blob?url=${encodeURIComponent(url)}`;
  }
  return url;
}
