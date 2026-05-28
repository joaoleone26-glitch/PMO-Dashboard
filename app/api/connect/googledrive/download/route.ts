import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const EXPORT_MIMES: Record<string, string> = {
  'application/vnd.google-apps.document':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet':
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation':
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get('gdrive_token')?.value;
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 });

  const fileId = req.nextUrl.searchParams.get('fileId');
  const mimeType = req.nextUrl.searchParams.get('mimeType') ?? '';

  if (!fileId) return NextResponse.json({ error: 'missing_fileId' }, { status: 400 });

  const exportMime = EXPORT_MIMES[mimeType];
  const url = exportMime
    ? `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`
    : `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const contentType = exportMime ?? mimeType ?? 'application/octet-stream';

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    return NextResponse.json({ error: 'download_failed', status: res.status }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: { 'Content-Type': contentType },
  });
}
