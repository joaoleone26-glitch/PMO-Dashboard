import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { parseFile } from '@/lib/parsers';
import { extractFieldsFromFile, consolidateProjectFiles } from '@/lib/projectAnalyzer';
import { DriveFileWithPath } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

const EXPORT_MIMES: Record<string, string> = {
  'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const EXPORT_EXT: Record<string, string> = {
  'application/vnd.google-apps.document': '.docx',
  'application/vnd.google-apps.spreadsheet': '.xlsx',
  'application/vnd.google-apps.presentation': '.pptx',
};

interface RawDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

async function listRecursive(
  token: string,
  folderId: string,
  path: string,
  depth = 0,
): Promise<DriveFileWithPath[]> {
  if (depth > 4) return [];

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('api_error');

  const data = await res.json() as { files?: RawDriveFile[] };
  const items = data.files ?? [];
  const files: DriveFileWithPath[] = [];

  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      const sub = await listRecursive(token, item.id, `${path}${item.name}/`, depth + 1);
      files.push(...sub);
    } else if (SUPPORTED_MIMES.has(item.mimeType)) {
      files.push({ ...item, filePath: `${path}${item.name}` });
    }
  }

  return files;
}

async function downloadAndParse(token: string, file: DriveFileWithPath): Promise<string> {
  const exportMime = EXPORT_MIMES[file.mimeType];
  const url = exportMime
    ? `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=${encodeURIComponent(exportMime)}`
    : `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`download_failed: ${file.name}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = EXPORT_EXT[file.mimeType] ?? '';
  const fileName = ext ? `${file.name}${ext}` : file.name;
  const mimeType = exportMime ?? file.mimeType;

  return parseFile(buffer, mimeType, fileName);
}

export async function POST(req: NextRequest) {
  const jar = await cookies();
  const token = jar.get('gdrive_token')?.value;
  const body = await req.json() as { folderId: string; folderName: string };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
      };

      try {
        if (!token) {
          send({ type: 'error', error: 'Sessão expirada — reconecte o Google Drive.' });
          return;
        }

        const { folderId, folderName } = body;

        send({ type: 'status', message: 'Escaneando pasta...' });
        const files = await listRecursive(token, folderId, '/');

        if (files.length === 0) {
          send({ type: 'error', error: 'Nenhum arquivo suportado encontrado nesta pasta.' });
          return;
        }

        send({ type: 'scan', fileCount: files.length });

        const extractions: ReturnType<typeof extractFieldsFromFile> extends Promise<infer T> ? T[] : never[] = [];
        const errors: string[] = [];

        // Process in batches of 3 for concurrency control
        const CONCURRENCY = 3;
        for (let i = 0; i < files.length; i += CONCURRENCY) {
          const batch = files.slice(i, i + CONCURRENCY);
          await Promise.allSettled(batch.map(async (file, batchIdx) => {
            const idx = i + batchIdx;
            send({ type: 'progress', current: idx + 1, total: files.length, fileName: file.name });

            try {
              const rawText = await downloadAndParse(token, file);
              const extraction = await extractFieldsFromFile(rawText, file.name, file.filePath);
              extraction.fileDate = file.modifiedTime;
              extractions.push(extraction);
            } catch (err) {
              console.error(`[consolidate] Error processing ${file.name}:`, err);
              errors.push(file.name);
            }
          }));
        }

        if (extractions.length === 0) {
          send({ type: 'error', error: 'Nenhum arquivo pôde ser processado. Verifique os logs.' });
          return;
        }

        send({ type: 'status', message: 'Consolidando dados...' });
        const consolidated = consolidateProjectFiles(extractions);
        consolidated.sourceFiles = files.map(f => f.name);

        send({ type: 'done', data: { consolidated, folderName, errors } });
      } catch (err) {
        console.error('[consolidate]', err);
        send({ type: 'error', error: 'Erro interno ao processar pasta.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
