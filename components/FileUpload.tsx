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

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="w-full">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-center px-4">
          {loading ? (
            <>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-600 font-medium">Processando com IA...</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">Clique ou arraste</span> um arquivo PMO
              </p>
              <p className="text-xs text-gray-400">CSV, Excel, JSON, PDF, DOCX</p>
            </>
          )}
        </div>
        <input type="file" className="hidden" onChange={onInputChange} accept=".csv,.xlsx,.xls,.json,.pdf,.docx,.doc,.txt" disabled={loading} />
      </label>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {lastFile && !error && !loading && (
        <p className="mt-2 text-xs text-emerald-600 font-medium">✓ {lastFile} processado com sucesso</p>
      )}
    </div>
  );
}
