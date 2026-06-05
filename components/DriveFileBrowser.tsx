'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileUploadResult, ConsolidatedProject } from '@/lib/types';
import { ProjectConsolidationReview } from './ProjectConsolidationReview';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

interface DriveFileWithPath extends DriveItem {
  filePath: string;
}

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

const GOOGLE_EXPORT_EXT: Record<string, string> = {
  'application/vnd.google-apps.document': '.docx',
  'application/vnd.google-apps.spreadsheet': '.xlsx',
  'application/vnd.google-apps.presentation': '.pptx',
};

function fileLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'text/csv': 'CSV', 'application/json': 'JSON', 'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.ms-excel.sheet.macroEnabled.12': 'XLSM',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
    'image/png': 'IMG', 'image/jpeg': 'IMG', 'image/gif': 'IMG', 'image/webp': 'IMG',
    'application/xml': 'XML', 'text/xml': 'XML',
    'application/rtf': 'RTF', 'text/rtf': 'RTF',
    'application/vnd.google-apps.document': 'GDoc',
    'application/vnd.google-apps.spreadsheet': 'GSheet',
    'application/vnd.google-apps.presentation': 'GSlide',
  };
  return map[mimeType] || 'FILE';
}

type FolderMode =
  | { stage: 'idle' }
  | { stage: 'scanning'; folderId: string; folderName: string }
  | { stage: 'scanned'; folderId: string; folderName: string; fileCount: number; folderCount: number; files: DriveFileWithPath[] }
  | { stage: 'processing'; folderId: string; folderName: string; current: number; total: number; fileName: string; status?: string }
  | { stage: 'done'; consolidated: ConsolidatedProject; folderName: string; errors: string[] };

interface Props {
  onFileProcessed: (result: FileUploadResult) => void;
}

export function DriveFileBrowser({ onFileProcessed }: Props) {
  const [open, setOpen] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Meu Drive' },
  ]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [hoveredFolderId, setHoveredFolderId] = useState<string | null>(null);
  const [folderMode, setFolderMode] = useState<FolderMode>({ stage: 'idle' });

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id;

  const fetchFiles = useCallback(async (folderId: string) => {
    setLoadingFiles(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/connect/googledrive/files?folderId=${folderId}`);
      const data = await res.json() as { files?: DriveItem[]; error?: string };
      if (data.error) throw new Error(data.error === 'not_connected' ? 'Sessão expirada — reconecte o Google Drive.' : data.error);
      setItems(data.files ?? []);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Erro ao carregar arquivos');
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchFiles(currentFolderId);
  }, [open, currentFolderId, fetchFiles]);

  const navigateInto = (item: DriveItem) => {
    setBreadcrumb(prev => [...prev, { id: item.id, name: item.name }]);
    setSelectedIds(new Set());
    setFolderMode({ stage: 'idle' });
  };

  const navigateTo = (idx: number) => {
    setBreadcrumb(prev => prev.slice(0, idx + 1));
    setSelectedIds(new Set());
    setFolderMode({ stage: 'idle' });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── Folder consolidation ───────────────────────────────────────────────────

  const handleScanFolder = useCallback(async (folder: DriveItem) => {
    setFolderMode({ stage: 'scanning', folderId: folder.id, folderName: folder.name });
    try {
      const res = await fetch(`/api/connect/googledrive/files?folderId=${folder.id}&recursive=true`);
      const data = await res.json() as { files?: DriveFileWithPath[]; totalFolders?: number; error?: string };
      if (data.error) throw new Error(data.error);
      const files = data.files ?? [];
      setFolderMode({
        stage: 'scanned',
        folderId: folder.id,
        folderName: folder.name,
        fileCount: files.length,
        folderCount: data.totalFolders ?? 0,
        files,
      });
    } catch (e) {
      setFolderMode({ stage: 'idle' });
      setImportError(e instanceof Error ? e.message : 'Erro ao escanear pasta');
    }
  }, []);

  const handleProcessFolder = useCallback(async () => {
    if (folderMode.stage !== 'scanned') return;
    const { folderId, folderName } = folderMode;

    setFolderMode({ stage: 'processing', folderId, folderName, current: 0, total: 0, fileName: '', status: 'Iniciando...' });

    try {
      const res = await fetch('/api/connect/googledrive/consolidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, folderName }),
      });

      if (!res.body) throw new Error('Sem resposta do servidor');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line) as Record<string, unknown>;
            if (event.type === 'status') {
              setFolderMode(prev => prev.stage === 'processing'
                ? { ...prev, status: event.message as string }
                : prev);
            } else if (event.type === 'scan') {
              setFolderMode(prev => prev.stage === 'processing'
                ? { ...prev, total: event.fileCount as number }
                : prev);
            } else if (event.type === 'progress') {
              setFolderMode(prev => prev.stage === 'processing'
                ? { ...prev, current: event.current as number, total: event.total as number, fileName: event.fileName as string, status: undefined }
                : prev);
            } else if (event.type === 'done') {
              const d = event.data as { consolidated: ConsolidatedProject; folderName: string; errors: string[] };
              setFolderMode({ stage: 'done', consolidated: d.consolidated, folderName: d.folderName, errors: d.errors });
              return;
            } else if (event.type === 'error') {
              throw new Error(event.error as string);
            }
          } catch (parseErr) {
            // ignore malformed line — but re-throw actual errors
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (e) {
      setFolderMode({ stage: 'idle' });
      setImportError(e instanceof Error ? e.message : 'Erro ao processar pasta');
    }
  }, [folderMode]);

  const handleConsolidationConfirm = useCallback((project: import('@/lib/types').Project) => {
    const folderName = folderMode.stage === 'done' ? folderMode.folderName : 'Pasta';
    onFileProcessed({ fileName: folderName, format: 'PASTA', projects: [project] });
    setFolderMode({ stage: 'idle' });
  }, [folderMode, onFileProcessed]);

  // ─── Regular file import ────────────────────────────────────────────────────

  const handleImport = async () => {
    const toImport = items.filter(i => selectedIds.has(i.id));
    if (!toImport.length) return;
    setImporting(true);
    setImportError(null);

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i];
      setProgress({ current: i + 1, total: toImport.length, fileName: item.name });
      try {
        const dlRes = await fetch(
          `/api/connect/googledrive/download?fileId=${item.id}&mimeType=${encodeURIComponent(item.mimeType)}`
        );
        if (!dlRes.ok) throw new Error(`Falha ao baixar "${item.name}"`);
        const blob = await dlRes.blob();
        const ext = GOOGLE_EXPORT_EXT[item.mimeType] ?? '';
        const fileName = item.name.endsWith(ext) ? item.name : item.name + ext;
        const file = new File([blob], fileName, { type: blob.type || item.mimeType });
        const form = new FormData();
        form.append('file', file);

        const upRes = await fetch('/api/upload', { method: 'POST', body: form });
        if (!upRes.body) throw new Error('Sem resposta do servidor');

        const reader = upRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let result: FileUploadResult | null = null;
        let serverErr: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const ln of lines) {
            if (!ln.trim()) continue;
            try {
              const ev = JSON.parse(ln) as { type: string; data?: FileUploadResult; error?: string };
              if (ev.type === 'done' && ev.data) result = ev.data;
              if (ev.type === 'error' && ev.error) serverErr = ev.error;
            } catch { /* ignore */ }
          }
        }

        if (serverErr) throw new Error(serverErr);
        if (!result) throw new Error(`Resposta incompleta para "${item.name}"`);
        onFileProcessed(result);
      } catch (e) {
        setImportError(e instanceof Error ? e.message : 'Erro desconhecido');
      }
    }

    setImporting(false);
    setProgress(null);
    setSelectedIds(new Set());
  };

  const folders = items.filter(i => i.mimeType === FOLDER_MIME);
  const files = items.filter(i => i.mimeType !== FOLDER_MIME && SUPPORTED_MIMES.has(i.mimeType));
  const unsupportedCount = items.filter(i => i.mimeType !== FOLDER_MIME && !SUPPORTED_MIMES.has(i.mimeType)).length;
  const allSupportedSelected = files.length > 0 && files.every(f => selectedIds.has(f.id));

  // ─── Consolidation review overlay ──────────────────────────────────────────
  if (folderMode.stage === 'done') {
    return (
      <ProjectConsolidationReview
        consolidated={folderMode.consolidated}
        folderName={folderMode.folderName}
        errors={folderMode.errors}
        onConfirm={handleConsolidationConfirm}
        onCancel={() => setFolderMode({ stage: 'idle' })}
      />
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', marginTop: 8, padding: '6px 0',
          background: 'rgba(96,165,250,0.07)',
          border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: 7, color: '#60A5FA',
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
        Navegar arquivos
      </button>
    );
  }

  return (
    <div style={{
      marginTop: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 9, overflow: 'hidden',
      background: '#0D0D0D',
    }}>
      {/* Breadcrumb header */}
      <div style={{
        padding: '7px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {breadcrumb.map((b, idx) => (
          <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {idx > 0 && <span style={{ color: '#3F3F46', fontSize: 9, margin: '0 1px' }}>›</span>}
            <button
              onClick={() => navigateTo(idx)}
              disabled={idx === breadcrumb.length - 1}
              style={{
                background: 'none', border: 'none', padding: '1px 3px',
                color: idx === breadcrumb.length - 1 ? '#E4E4E7' : '#60A5FA',
                fontSize: 10, cursor: idx === breadcrumb.length - 1 ? 'default' : 'pointer',
                maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {b.name}
            </button>
          </span>
        ))}
        <span style={{ flex: 1 }} />
        <button
          onClick={() => { setOpen(false); setSelectedIds(new Set()); setFolderMode({ stage: 'idle' }); }}
          style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>

      {/* Folder scan preview */}
      {(folderMode.stage === 'scanned' || folderMode.stage === 'scanning' || folderMode.stage === 'processing') && (
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(213,0,28,0.04)',
          border: '1px solid rgba(213,0,28,0.15)',
          borderRadius: 0,
        }}>
          {folderMode.stage === 'scanning' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                border: '2px solid rgba(213,0,28,0.3)', borderTopColor: '#D5001C',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: '#A1A1AA' }}>
                Escaneando "{folderMode.folderName}"...
              </span>
            </div>
          )}

          {folderMode.stage === 'scanned' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#E4E4E7', fontWeight: 600 }}>
                    📁 {folderMode.folderName}
                  </p>
                  <p style={{ fontSize: 10, color: '#71717A', marginTop: 2 }}>
                    {folderMode.fileCount} arquivo{folderMode.fileCount !== 1 ? 's' : ''} em {folderMode.folderCount} subpasta{folderMode.folderCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setFolderMode({ stage: 'idle' })}
                  style={{ background: 'none', border: 'none', color: '#3F3F46', cursor: 'pointer', fontSize: 14, padding: 2 }}
                >
                  ×
                </button>
              </div>
              {folderMode.fileCount === 0 ? (
                <p style={{ fontSize: 10, color: '#F87171' }}>Nenhum arquivo suportado encontrado.</p>
              ) : (
                <button
                  onClick={handleProcessFolder}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 6,
                    background: '#D5001C', border: 'none',
                    color: '#FFFFFF', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                  Processar pasta completa como 1 projeto
                </button>
              )}
            </div>
          )}

          {folderMode.stage === 'processing' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: '#E4E4E7', fontWeight: 600 }}>
                  {folderMode.status ?? `Processando ${folderMode.current} de ${folderMode.total} arquivos...`}
                </span>
                <span style={{ fontSize: 9, color: '#52525B' }}>
                  {folderMode.total > 0 ? `${Math.round((folderMode.current / folderMode.total) * 100)}%` : ''}
                </span>
              </div>
              {folderMode.fileName && (
                <p style={{ fontSize: 9, color: '#52525B', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folderMode.fileName}
                </p>
              )}
              {folderMode.total > 0 && (
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
                  <div style={{
                    height: '100%', borderRadius: 99, background: '#D5001C',
                    width: `${(folderMode.current / folderMode.total) * 100}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Select-all row */}
      {!loadingFiles && files.length > 0 && folderMode.stage === 'idle' && (
        <div
          onClick={() => {
            if (allSupportedSelected) setSelectedIds(new Set());
            else setSelectedIds(new Set(files.map(f => f.id)));
          }}
          style={{
            padding: '5px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <span style={{
            width: 12, height: 12, borderRadius: 3, flexShrink: 0,
            background: allSupportedSelected ? '#60A5FA' : 'transparent',
            border: `1.5px solid ${allSupportedSelected ? '#60A5FA' : 'rgba(255,255,255,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {allSupportedSelected && (
              <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span style={{ fontSize: 9, color: '#52525B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Selecionar todos os arquivos
          </span>
        </div>
      )}

      {/* File list */}
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        {loadingFiles ? (
          <div style={{ padding: '22px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{
              width: 16, height: 16,
              border: '2px solid rgba(96,165,250,0.15)',
              borderTopColor: '#60A5FA',
              borderRadius: '50%', display: 'inline-block',
              animation: 'spin 0.7s linear infinite',
            }} />
          </div>
        ) : fetchError ? (
          <p style={{ padding: '12px 10px', fontSize: 10, color: '#F87171', lineHeight: 1.5 }}>{fetchError}</p>
        ) : (
          <>
            {folders.map(folder => {
              const isHovered = hoveredFolderId === folder.id;
              const isScanning = folderMode.stage === 'scanning' && folderMode.folderId === folder.id;
              return (
                <div
                  key={folder.id}
                  style={{
                    padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={() => setHoveredFolderId(folder.id)}
                  onMouseLeave={() => setHoveredFolderId(null)}
                >
                  {/* Navigate icon */}
                  <div
                    onClick={() => navigateInto(folder)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', minWidth: 0 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#FBBF24">
                      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                    </svg>
                    <span style={{ fontSize: 11, color: '#D4D4D8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {folder.name}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    {/* Process folder button */}
                    {(isHovered || isScanning) && (
                      <button
                        onClick={e => { e.stopPropagation(); handleScanFolder(folder); }}
                        disabled={isScanning}
                        title="Processar pasta como 1 projeto"
                        style={{
                          padding: '2px 6px', borderRadius: 4,
                          background: isScanning ? 'rgba(213,0,28,0.08)' : 'rgba(213,0,28,0.12)',
                          border: '1px solid rgba(213,0,28,0.25)',
                          color: '#D5001C', fontSize: 9, fontWeight: 700,
                          cursor: isScanning ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 3,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.12s',
                        }}
                      >
                        {isScanning ? (
                          <>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1.5px solid rgba(213,0,28,0.3)', borderTopColor: '#D5001C', animation: 'spin 0.7s linear infinite' }} />
                            Escaneando...
                          </>
                        ) : (
                          <>⊕ Projeto</>
                        )}
                      </button>
                    )}

                    {/* Navigate chevron */}
                    <div
                      onClick={() => navigateInto(folder)}
                      style={{ cursor: 'pointer', padding: '2px 2px', opacity: isHovered ? 1 : 0.5 }}
                    >
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M3 2l4 3-4 3" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}

            {files.map(file => {
              const checked = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => toggleSelect(file.id)}
                  style={{
                    padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: checked ? 'rgba(96,165,250,0.07)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 13, height: 13, borderRadius: 3, flexShrink: 0,
                    background: checked ? '#60A5FA' : 'transparent',
                    border: `1.5px solid ${checked ? '#60A5FA' : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s ease',
                  }}>
                    {checked && (
                      <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{
                    fontSize: 7, fontWeight: 800, color: '#60A5FA',
                    background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)',
                    borderRadius: 3, padding: '1px 3px', flexShrink: 0, letterSpacing: '0.02em',
                  }}>
                    {fileLabel(file.mimeType)}
                  </span>
                  <span style={{
                    fontSize: 11, color: checked ? '#E4E4E7' : '#A1A1AA',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    transition: 'color 0.1s',
                  }}>
                    {file.name}
                  </span>
                </div>
              );
            })}

            {folders.length === 0 && files.length === 0 && (
              <p style={{ padding: '20px 10px', fontSize: 11, color: '#3F3F46', textAlign: 'center' }}>
                Pasta vazia
              </p>
            )}

            {unsupportedCount > 0 && (
              <p style={{ padding: '5px 10px 6px', fontSize: 9, color: '#3F3F46' }}>
                +{unsupportedCount} arquivo{unsupportedCount !== 1 ? 's' : ''} não suportado{unsupportedCount !== 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px' }}>
        {importing && progress ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: '#E4E4E7', fontWeight: 500 }}>
                Processando {progress.current} de {progress.total} arquivos...
              </span>
            </div>
            <div style={{ fontSize: 9, color: '#52525B', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {progress.fileName}
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99 }}>
              <div style={{
                height: '100%', borderRadius: 99, background: '#60A5FA',
                width: `${(progress.current / progress.total) * 100}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: '#52525B', flex: 1 }}>
              {selectedIds.size > 0
                ? `${selectedIds.size} selecionado${selectedIds.size !== 1 ? 's' : ''}`
                : 'Selecione arquivos ou processe uma pasta'}
            </span>
            {importError && (
              <span style={{ fontSize: 9, color: '#F87171', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={importError}>
                {importError}
              </span>
            )}
            <button
              onClick={handleImport}
              disabled={selectedIds.size === 0}
              style={{
                fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, flexShrink: 0,
                background: selectedIds.size > 0 ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${selectedIds.size > 0 ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.07)'}`,
                color: selectedIds.size > 0 ? '#60A5FA' : '#3F3F46',
                cursor: selectedIds.size > 0 ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              Importar selecionados
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
