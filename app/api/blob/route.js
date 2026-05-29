import { NextResponse } from 'next/server';


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const pathname = searchParams.get('pathname');
  const target = url || pathname;

  if (!target) {
    return NextResponse.json({ error: 'Missing url or pathname' }, { status: 400 });
  }

  // Proxy the private blob by fetching it server-side using the configured token.
  const authToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN || undefined;

  const fetchHeaders = {};
  if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`;
  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch) fetchHeaders['If-None-Match'] = ifNoneMatch;

  const resp = await fetch(target, { headers: fetchHeaders });

  if (resp.status === 404) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (resp.status === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: resp.headers.get('etag') || undefined,
        'Cache-Control': 'private, no-cache',
      },
    });
  }

  const contentType = resp.headers.get('content-type') || 'application/octet-stream';
  const etag = resp.headers.get('etag') || undefined;

  return new NextResponse(resp.body, {
    status: resp.status,
    headers: {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      ...(etag ? { ETag: etag } : {}),
      'Cache-Control': 'private, no-cache',
    },
  });
}
