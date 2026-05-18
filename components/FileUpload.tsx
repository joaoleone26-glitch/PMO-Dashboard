'use client';

import { useCallback, useState } from 'react';
import { Project } from '@/lib/types';

interface Props {
  onProjectsLoaded: (projects: Project[]) => void;
}

export function FileUpload({ onProjectsLoaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');
      setLastFile(file.name);
      onProjectsLoaded(data.projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar arquivo');
    } finally {
      setLoading(false);
    }
  }, [onProjectsLoaded]);

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
          height: 110,
          border: `1px dashed ${dragging ? '#D5001C' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 10,
          cursor: 'pointer',
          background: dragging ? 'rgba(213,0,28,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.18s ease',
          gap: 8,
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(213,0,28,0.3)', borderTopColor: '#D5001C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 12, color: '#D5001C', fontWeight: 500 }}>Processando com IA...</p>
          </>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: 12, color: '#71717A', textAlign: 'center' }}>
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
        <p style={{ fontSize: 11, color: '#EF4444', marginTop: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6 }}>
          {error}
        </p>
      )}
      {lastFile && !error && !loading && (
        <p style={{ fontSize: 11, color: '#22C55E', marginTop: 8 }}>✓ {lastFile} processado</p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
