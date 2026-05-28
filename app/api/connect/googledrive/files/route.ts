import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get('gdrive_token')?.value;
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get('folderId') || 'root';

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder%2Cname&pageSize=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json({ error: (err as { error?: { message?: string } }).error?.message ?? 'api_error' }, { status: res.status });
  }

  const data = await res.json() as { files?: unknown[] };
  return NextResponse.json({ files: data.files ?? [] });
}
