import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DriveFileWithPath } from '@/lib/types';

const FOLDER_MIME = 'application/vnd.google-apps.folder';

const SUPPORTED_MIMES = new Set([
  'text/csv', 'application/json', 'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/xml', 'text/xml',
  'application/rtf', 'text/rtf',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
]);

interface RawDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

async function listFolderFlat(token: string, folderId: string): Promise<RawDriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=folder%2Cname&pageSize=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('api_error');
  const data = await res.json() as { files?: RawDriveFile[] };
  return data.files ?? [];
}

async function listRecursive(
  token: string,
  folderId: string,
  path: string,
  depth = 0,
): Promise<{ files: DriveFileWithPath[]; totalFolders: number }> {
  if (depth > 4) return { files: [], totalFolders: 0 };

  const items = await listFolderFlat(token, folderId);
  const files: DriveFileWithPath[] = [];
  let totalFolders = 0;

  await Promise.all(items.map(async item => {
    if (item.mimeType === FOLDER_MIME) {
      totalFolders++;
      const sub = await listRecursive(token, item.id, `${path}${item.name}/`, depth + 1);
      files.push(...sub.files);
      totalFolders += sub.totalFolders;
    } else if (SUPPORTED_MIMES.has(item.mimeType)) {
      files.push({ ...item, filePath: `${path}${item.name}` });
    }
  }));

  return { files, totalFolders };
}

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get('gdrive_token')?.value;
  if (!token) return NextResponse.json({ error: 'not_connected' }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get('folderId') || 'root';
  const recursive = req.nextUrl.searchParams.get('recursive') === 'true';

  if (recursive) {
    try {
      const { files, totalFolders } = await listRecursive(token, folderId, '/');
      return NextResponse.json({ files, totalFolders });
    } catch (err) {
      console.error('[gdrive/files] recursive error:', err);
      return NextResponse.json({ error: 'api_error' }, { status: 500 });
    }
  }

  // Simple flat listing (existing behavior)
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
