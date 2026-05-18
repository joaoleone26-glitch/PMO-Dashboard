'use client';

import { LoadedFile } from '@/lib/types';

const FORMAT_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  CSV:  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  XLSX: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  XLS:  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  JSON: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  PDF:  { color: '#D5001C', bg: 'rgba(213,0,28,0.1)',    border: 'rgba(213,0,28,0.25)'   },
  DOCX: { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  DOC:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  TXT:  { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' },
};

function formatLabel(fmt: string): string {
  const map: Record<string, string> = { XLSX: 'Excel', XLS: 'Excel', DOCX: 'Word', DOC: 'Word' };
  return map[fmt.toUpperCase()] || fmt.toUpperCase();
}

function FormatIcon({ format }: { format: string }) {
  const key = format.toUpperCase();
  const c = FORMAT_CONFIG[key] || FORMAT_CONFIG.TXT;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: c.bg, border: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: c.color, letterSpacing: '0.04em' }}>
        {formatLabel(format)}
      </span>
    </div>
  );
}

interface Props {
  files: LoadedFile[];
  onRemove: (fileId: string) => void;
}

export function LoadedFiles({ files, onRemove }: Props) {
  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600 }}>
          Arquivos Carregados
        </p>
        {files.length > 0 && (
          <span style={{ fontSize: 10, color: '#D5001C', fontWeight: 700, background: 'rgba(213,0,28,0.1)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 99, padding: '1px 7px' }}>
            {files.length}
          </span>
        )}
      </div>

      {files.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 0' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
            <polyline points="13 2 13 9 20 9" />
          </svg>
          <p style={{ fontSize: 11, color: '#3F3F46', textAlign: 'center', lineHeight: 1.5 }}>
            Nenhum arquivo carregado ainda
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {files.map(file => (
            <div
              key={file.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                transition: 'border-color 0.15s ease',
              }}
            >
              <FormatIcon format={file.format} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12, fontWeight: 500, color: '#E4E4E7',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 2,
                }}>
                  {file.fileName}
                </p>
                <p style={{ fontSize: 10, color: '#52525B' }}>
                  {file.projectCount} projeto{file.projectCount !== 1 ? 's' : ''} extraído{file.projectCount !== 1 ? 's' : ''}
                </p>
              </div>

              <button
                onClick={() => onRemove(file.id)}
                title="Remover arquivo"
                style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  background: 'rgba(213,0,28,0.0)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  color: '#52525B',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(213,0,28,0.12)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(213,0,28,0.3)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#D5001C';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(213,0,28,0.0)';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#52525B';
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
