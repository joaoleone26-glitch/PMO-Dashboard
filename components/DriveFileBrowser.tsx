'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileUploadResult } from '@/lib/types';

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';

const SUPPORTED_MIMES = new Set([
  'text/csv',
  'application/json',
  'application/pdf',
  'text/plain',
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
    'text/csv': 'CSV',
    'application/json': 'JSON',
    'application/pdf': 'PDF',
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
  };

  const navigateTo = (idx: number) => {
    setBreadcrumb(prev => prev.slice(0, idx + 1));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

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
        const data = await upRes.json() as { fileName: string; format: string; projects: unknown[]; error?: string };
        if (!upRes.ok) throw new Error(data.error ?? `Erro ao processar "${item.name}"`);
        onFileProcessed({ fileName: data.fileName, format: data.format, projects: data.projects as never });
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
          onClick={() => { setOpen(false); setSelectedIds(new Set()); }}
          style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
        >
          ×
        </button>
      </div>

      {/* Select-all row */}
      {!loadingFiles && files.length > 0 && (
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
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => navigateInto(folder)}
                style={{
                  padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#FBBF24">
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                <span style={{ fontSize: 11, color: '#D4D4D8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {folder.name}
                </span>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                  <path d="M3 2l4 3-4 3" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ))}

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
                    fontSize: 7, fontWeight: 800,
                    color: '#60A5FA',
                    background: 'rgba(96,165,250,0.1)',
                    border: '1px solid rgba(96,165,250,0.2)',
                    borderRadius: 3, padding: '1px 3px', flexShrink: 0,
                    letterSpacing: '0.02em',
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
                : 'Selecione arquivos'}
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
