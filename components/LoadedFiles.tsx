'use client';

import { useState } from 'react';
import { LoadedFile, Project } from '@/lib/types';

const FORMAT_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  // Tabular
  CSV:   { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  XLSX:  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  XLS:   { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  XLSM:  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  XLSB:  { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  // Data
  JSON:  { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  XML:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  XER:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  P6XML: { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  MPX:   { color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
  // Documents
  PDF:   { color: '#D5001C', bg: 'rgba(213,0,28,0.1)',    border: 'rgba(213,0,28,0.25)'   },
  DOCX:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  DOC:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  RTF:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  MSG:   { color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)'},
  PPTX:  { color: '#FB923C', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)' },
  PPT:   { color: '#FB923C', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)' },
  VSDX:  { color: '#FB923C', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)' },
  TXT:   { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.2)' },
  // Images
  PNG:   { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  JPG:   { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  JPEG:  { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  GIF:   { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  WEBP:  { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  TIFF:  { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  BMP:   { color: '#F472B6', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.25)'},
  // Project management
  MPP:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  MPT:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  MDB:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  ACCDB: { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  // CAD/BIM
  DWG:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  DXF:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  IFC:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  RVT:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  SKP:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  NWD:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  NWC:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
};

function formatLabel(fmt: string): string {
  const map: Record<string, string> = {
    XLSX: 'Excel', XLS: 'Excel', XLSM: 'Excel', XLSB: 'Excel',
    DOCX: 'Word', DOC: 'Word', RTF: 'Word',
    PPTX: 'PPT', PPT: 'PPT', VSDX: 'Visio',
    P6XML: 'P6', MPP: 'MS-P', MPT: 'MS-P', MPX: 'MPX',
    MDB: 'Access', ACCDB: 'Access',
    DWG: 'CAD', DXF: 'CAD', IFC: 'BIM', RVT: 'Revit',
    SKP: 'SKP', NWD: 'NW', NWC: 'NW',
    PNG: 'IMG', JPG: 'IMG', JPEG: 'IMG', GIF: 'IMG', WEBP: 'IMG', TIFF: 'IMG', BMP: 'IMG',
    MSG: 'Email',
  };
  return map[fmt.toUpperCase()] || fmt.toUpperCase();
}

function FormatIcon({ format }: { format: string }) {
  const key = format.toUpperCase();
  const c = FORMAT_CONFIG[key] || FORMAT_CONFIG.TXT;
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 7, flexShrink: 0,
      background: c.bg, border: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 8, fontWeight: 800, color: c.color, letterSpacing: '0.04em' }}>
        {formatLabel(format)}
      </span>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      aria-checked={on}
      role="switch"
      style={{
        width: 36, height: 20, borderRadius: 99, border: 'none', flexShrink: 0,
        background: on ? '#D5001C' : 'rgba(255,255,255,0.1)',
        cursor: 'pointer', padding: 0, position: 'relative',
        transition: 'background 0.18s ease',
        boxShadow: on ? '0 0 8px rgba(213,0,28,0.4)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 18 : 3,
        width: 14, height: 14, borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.18s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

interface Props {
  files: LoadedFile[];
  projects: Project[];
  selectedProjectIds: Set<string>;
  onRemove: (fileId: string) => void;
  onToggleFile: (fileId: string) => void;
  onToggleProject: (projectId: string) => void;
}

export function LoadedFiles({ files, projects, selectedProjectIds, onRemove, onToggleFile, onToggleProject }: Props) {
  const [expandedFileIds, setExpandedFileIds] = useState<Set<string>>(new Set());

  const toggleExpand = (fileId: string) => {
    setExpandedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId); else next.add(fileId);
      return next;
    });
  };

  const projectMap = new Map(projects.map(p => [p.id, p]));

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
          {files.map(file => {
            const isExpanded = expandedFileIds.has(file.id);
            const fileProjectIds = file.projectIds;
            const allOn = fileProjectIds.length > 0 && fileProjectIds.every(id => selectedProjectIds.has(id));

            return (
              <div key={file.id} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {/* File row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
                  {/* Expand chevron */}
                  {fileProjectIds.length > 0 && (
                    <button
                      onClick={() => toggleExpand(file.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#52525B', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                      <svg
                        width="10" height="10" viewBox="0 0 10 10" fill="none"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                      >
                        <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}

                  <FormatIcon format={file.format} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 11, fontWeight: 500, color: '#E4E4E7',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 1,
                    }}>
                      {file.fileName}
                    </p>
                    <p style={{ fontSize: 10, color: '#52525B' }}>
                      {file.projectCount} projeto{file.projectCount !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <Toggle on={allOn} onChange={() => onToggleFile(file.id)} />

                  <button
                    onClick={() => onRemove(file.id)}
                    title="Remover arquivo"
                    style={{
                      width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                      background: 'rgba(213,0,28,0.0)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.15s ease', color: '#52525B',
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
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Expanded project list */}
                {isExpanded && fileProjectIds.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '6px 10px 8px 30px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {fileProjectIds.map(pid => {
                      const project = projectMap.get(pid);
                      const checked = selectedProjectIds.has(pid);
                      return (
                        <label
                          key={pid}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleProject(pid)}
                            style={{ display: 'none' }}
                          />
                          <span style={{
                            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                            background: checked ? '#D5001C' : 'transparent',
                            border: `1.5px solid ${checked ? '#D5001C' : 'rgba(255,255,255,0.18)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            boxShadow: checked ? '0 0 6px rgba(213,0,28,0.35)' : 'none',
                          }}>
                            {checked && (
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span style={{
                            fontSize: 11, color: checked ? '#E4E4E7' : '#71717A',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            transition: 'color 0.15s ease',
                          }}>
                            {project?.name || pid}
                          </span>
                          {project && (
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                              background: project.farol === 'verde' ? '#22C55E' : project.farol === 'amarelo' ? '#F59E0B' : project.farol === 'vermelho' ? '#D5001C' : '#4B5563',
                            }} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
