'use client';

import { useCallback, useState } from 'react';
import { FileUploadResult } from '@/lib/types';

interface Props {
  onFileProcessed: (result: FileUploadResult) => void;
}

export function FileUpload({ onFileProcessed }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      // Pass the full result to parent so it can track files + projects
      onFileProcessed({
        fileName: data.fileName,
        format: data.format,
        projects: data.projects,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  }, [onFileProcessed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
        Importar Dados PMO
      </p>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 100,
          border: `1px dashed ${dragging ? '#D5001C' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10,
          cursor: loading ? 'default' : 'pointer',
          background: dragging ? 'rgba(213,0,28,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.18s ease',
          gap: 8,
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: 22, height: 22,
              border: '2px solid rgba(213,0,28,0.25)',
              borderTopColor: '#D5001C',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }} />
            <p style={{ fontSize: 12, color: '#D5001C', fontWeight: 500 }}>Processando com IA...</p>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: 12, color: '#71717A', textAlign: 'center', lineHeight: 1.5 }}>
              <span style={{ color: '#D5001C', fontWeight: 600 }}>Clique ou arraste</span> um arquivo
            </p>
            <p style={{ fontSize: 10, color: '#3F3F46' }}>CSV · Excel · JSON · PDF · DOCX</p>
          </>
        )}
        <input
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          accept=".csv,.xlsx,.xls,.json,.pdf,.docx,.doc,.txt"
          disabled={loading}
        />
      </label>

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(213,0,28,0.07)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 8 }}>
          <p style={{ fontSize: 11, color: '#F87171', lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
