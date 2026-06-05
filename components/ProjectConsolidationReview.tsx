'use client';

import { useState, useCallback } from 'react';
import {
  ConsolidatedProject,
  Project,
  FarolStatus,
  ProjectPhase,
  MonthlyDataPoint,
  Risk,
  ProjectScope,
} from '@/lib/types';
import { formatCurrency } from '@/lib/formatCurrency';

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome do Projeto',
  company: 'Empresa / Área',
  responsible: 'Responsável',
  phase: 'Fase',
  status: 'Status',
  farol: 'Farol',
  progress: '% Conclusão',
  startDate: 'Data de Início',
  deadline: 'Prazo de Entrega',
  description: 'Descrição',
  bac: 'Orçamento (BAC)',
  ev: 'Earned Value (EV)',
  ac: 'Custo Real (AC)',
  pv: 'Planned Value (PV)',
  monthlyData: 'Dados Mensais (Curva S)',
  risks: 'Riscos Mapeados',
  difficulties: 'Dificuldades',
  attentionPoints: 'Pontos de Atenção',
  scope: 'Escopo',
  team: 'Equipe',
  knowledgeArea: 'Área de Conhecimento',
  riskProbability: 'Probabilidade de Risco',
  riskImpact: 'Impacto de Risco',
};

function label(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

function formatValue(fieldName: string, value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') {
    if (['bac', 'ev', 'ac', 'pv'].includes(fieldName)) return formatCurrency(value);
    if (fieldName === 'progress') return `${value}%`;
    return String(value);
  }
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (fieldName === 'risks') return `${value.length} risco${value.length !== 1 ? 's' : ''}`;
    if (fieldName === 'monthlyData') return `${value.length} pontos de dados`;
    if (fieldName === 'difficulties' || fieldName === 'attentionPoints') {
      const arr = value as string[];
      if (arr.length <= 2) return arr.join('; ');
      return `${arr.slice(0, 2).join('; ')} + ${arr.length - 2} mais`;
    }
    if (fieldName === 'team') return (value as string[]).join(', ');
    return `${value.length} itens`;
  }
  if (typeof value === 'object' && value !== null) {
    if (fieldName === 'scope') {
      const s = value as ProjectScope;
      return `${s.completedDeliverables ?? '?'}/${s.plannedDeliverables ?? '?'} entregas`;
    }
    return JSON.stringify(value).slice(0, 80);
  }
  return String(value);
}

function FarolDot({ value }: { value: unknown }) {
  const colors: Record<string, string> = { verde: '#22C55E', amarelo: '#EAB308', vermelho: '#EF4444', cinza: '#71717A' };
  const v = String(value);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[v] ?? '#71717A', flexShrink: 0 }} />
      {v}
    </span>
  );
}

function ValueDisplay({ fieldName, value }: { fieldName: string; value: unknown }) {
  if (fieldName === 'farol') return <FarolDot value={value} />;
  return <span>{formatValue(fieldName, value)}</span>;
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help', color: '#52525B', fontSize: 10, borderBottom: '1px dashed #52525B' }}
      >
        raciocínio
      </span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
          background: '#1C1C1C', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6, padding: '6px 10px', zIndex: 100,
          fontSize: 11, color: '#A1A1AA', maxWidth: 260, lineHeight: 1.5,
          whiteSpace: 'normal', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

function SectionHeader({ emoji, title, count, bg }: { emoji: string; title: string; count: number; bg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderRadius: 8, marginBottom: 10,
      background: bg,
    }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#E4E4E7', flex: 1 }}>{title}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '2px 8px',
        background: 'rgba(255,255,255,0.08)', borderRadius: 99, color: '#A1A1AA',
      }}>
        {count} campo{count !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

interface Props {
  consolidated: ConsolidatedProject;
  folderName: string;
  errors: string[];
  onConfirm: (project: Project) => void;
  onCancel: () => void;
}

export function ProjectConsolidationReview({ consolidated, folderName, errors, onConfirm, onCancel }: Props) {
  const [confirmedChecked, setConfirmedChecked] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    consolidated.confirmed.forEach(c => { map[c.fieldName] = true; });
    return map;
  });

  const [conflictSelections, setConflictSelections] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    consolidated.conflicts.forEach(c => {
      const recIdx = c.options.findIndex(o => o.recommended);
      map[c.fieldName] = recIdx >= 0 ? recIdx : 0;
    });
    return map;
  });

  const [reviewValues, setReviewValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    consolidated.needsReview.forEach(nr => {
      map[nr.fieldName] = typeof nr.value === 'string' ? nr.value :
        typeof nr.value === 'number' ? String(nr.value) : '';
    });
    return map;
  });

  const [manualFills, setManualFills] = useState<Record<string, string>>({});

  const handleConfirm = useCallback(() => {
    const fields: Record<string, unknown> = {};

    // Confirmed fields (if checked)
    for (const c of consolidated.confirmed) {
      if (confirmedChecked[c.fieldName] !== false) {
        fields[c.fieldName] = c.value;
      }
    }

    // Conflict resolutions
    for (const conflict of consolidated.conflicts) {
      const idx = conflictSelections[conflict.fieldName] ?? 0;
      if (idx >= 0 && idx < conflict.options.length) {
        fields[conflict.fieldName] = conflict.options[idx].value;
      }
    }

    // Needs review (possibly edited by user)
    for (const nr of consolidated.needsReview) {
      const edited = reviewValues[nr.fieldName];
      if (edited !== undefined && edited !== '') {
        // Try parsing number fields
        const numFields = ['progress', 'bac', 'ev', 'ac', 'pv', 'riskProbability', 'riskImpact'];
        if (numFields.includes(nr.fieldName) && !isNaN(Number(edited))) {
          fields[nr.fieldName] = Number(edited);
        } else {
          fields[nr.fieldName] = edited;
        }
      } else if (nr.value != null) {
        fields[nr.fieldName] = nr.value;
      }
    }

    // Manual fills for missing fields
    for (const [fieldName, val] of Object.entries(manualFills)) {
      if (val.trim()) {
        const numFields = ['progress', 'bac', 'ev', 'ac', 'pv'];
        if (numFields.includes(fieldName) && !isNaN(Number(val))) {
          fields[fieldName] = Number(val);
        } else {
          fields[fieldName] = val;
        }
      }
    }

    const project: Project = {
      id: `proj-${Date.now()}-consolidated`,
      name: (fields.name as string) || folderName || 'Projeto Consolidado',
      company: (fields.company as string) || '',
      farol: (fields.farol as FarolStatus) || 'cinza',
      status: (fields.status as string) || '',
      kpis: [],
      difficulties: (fields.difficulties as string[]) || [],
      attentionPoints: (fields.attentionPoints as string[]) || [],
      lastUpdated: new Date().toISOString(),
      description: fields.description as string | undefined,
      progress: fields.progress as number | undefined,
      startDate: fields.startDate as string | undefined,
      deadline: fields.deadline as string | undefined,
      responsible: fields.responsible as string | undefined,
      phase: fields.phase as ProjectPhase | undefined,
      bac: fields.bac as number | undefined,
      ev: fields.ev as number | undefined,
      ac: fields.ac as number | undefined,
      pv: fields.pv as number | undefined,
      monthlyData: fields.monthlyData as MonthlyDataPoint[] | undefined,
      risks: fields.risks as Risk[] | undefined,
      scope: fields.scope as ProjectScope | undefined,
      team: fields.team as string[] | undefined,
      riskProbability: fields.riskProbability as number | undefined,
      riskImpact: fields.riskImpact as number | undefined,
    };

    onConfirm(project);
  }, [consolidated, confirmedChecked, conflictSelections, reviewValues, manualFills, folderName, onConfirm]);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  // Priority missing fields to show manual input for
  const PRIORITY_MISSING = ['name', 'farol', 'progress', 'responsible', 'deadline', 'bac'];
  const priorityMissing = consolidated.missing.filter(f => PRIORITY_MISSING.includes(f));
  const otherMissing = consolidated.missing.filter(f => !PRIORITY_MISSING.includes(f));

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 860,
        maxHeight: '90vh', overflowY: 'auto',
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* ─── Header ─── */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6 }}>
                Consolidação de Pasta
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', marginBottom: 4 }}>
                {consolidated.projectName ? (
                  <>Projeto identificado: <span style={{ color: '#D5001C' }}>{consolidated.projectName}</span></>
                ) : (
                  <>📁 {folderName}</>
                )}
              </h2>
              <p style={{ fontSize: 12, color: '#71717A' }}>
                {consolidated.sourceFiles.length} arquivo{consolidated.sourceFiles.length !== 1 ? 's' : ''} processado{consolidated.sourceFiles.length !== 1 ? 's' : ''}
                {errors.length > 0 && (
                  <span style={{ color: '#F87171', marginLeft: 8 }}>
                    · {errors.length} com erro
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onCancel}
              style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ✅ Confirmed */}
          {consolidated.confirmed.length > 0 && (
            <section>
              <SectionHeader
                emoji="✅"
                title="Campos confirmados"
                count={consolidated.confirmed.length}
                bg="rgba(34,197,94,0.06)"
              />
              <div style={{ border: '1px solid rgba(34,197,94,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(34,197,94,0.04)' }}>
                      <th style={{ width: 28, padding: '7px 10px' }} />
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Campo</th>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Valor</th>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidated.confirmed.map((c, i) => {
                      const checked = confirmedChecked[c.fieldName] !== false;
                      return (
                        <tr
                          key={c.fieldName}
                          style={{
                            borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                            background: checked ? 'transparent' : 'rgba(255,255,255,0.02)',
                            cursor: 'pointer',
                          }}
                          onClick={() => setConfirmedChecked(prev => ({ ...prev, [c.fieldName]: !prev[c.fieldName] }))}
                        >
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{
                              width: 13, height: 13, borderRadius: 3, display: 'inline-flex',
                              alignItems: 'center', justifyContent: 'center',
                              background: checked ? '#22C55E' : 'transparent',
                              border: `1.5px solid ${checked ? '#22C55E' : 'rgba(255,255,255,0.2)'}`,
                              flexShrink: 0,
                            }}>
                              {checked && (
                                <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#A1A1AA', fontWeight: 500 }}>
                            {label(c.fieldName)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#E4E4E7', fontWeight: 500 }}>
                            <ValueDisplay fieldName={c.fieldName} value={c.value} />
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 11, color: '#52525B' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                                {c.source}
                              </span>
                              {c.reasoning && <Tooltip text={c.reasoning} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ⚠️ Conflicts */}
          {consolidated.conflicts.length > 0 && (
            <section>
              <SectionHeader
                emoji="⚠️"
                title="Conflitos entre arquivos"
                count={consolidated.conflicts.length}
                bg="rgba(234,179,8,0.06)"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {consolidated.conflicts.map(conflict => {
                  const selectedIdx = conflictSelections[conflict.fieldName] ?? 0;
                  return (
                    <div
                      key={conflict.fieldName}
                      style={{
                        border: '1px solid rgba(234,179,8,0.2)',
                        borderRadius: 8, overflow: 'hidden',
                        background: 'rgba(234,179,8,0.03)',
                      }}
                    >
                      <div style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(234,179,8,0.12)',
                        background: 'rgba(234,179,8,0.04)',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#EAB308' }}>
                          {label(conflict.fieldName)}
                        </span>
                        <span style={{ fontSize: 10, color: '#71717A' }}>
                          — {conflict.options.length} valores encontrados
                        </span>
                      </div>
                      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {conflict.options.map((opt, idx) => (
                          <label
                            key={idx}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10,
                              cursor: 'pointer', padding: '8px 10px', borderRadius: 6,
                              background: selectedIdx === idx ? 'rgba(213,0,28,0.06)' : 'transparent',
                              border: `1px solid ${selectedIdx === idx ? 'rgba(213,0,28,0.2)' : 'rgba(255,255,255,0.05)'}`,
                              transition: 'all 0.12s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name={`conflict-${conflict.fieldName}`}
                              checked={selectedIdx === idx}
                              onChange={() => setConflictSelections(prev => ({ ...prev, [conflict.fieldName]: idx }))}
                              style={{ marginTop: 2, accentColor: '#D5001C', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#E4E4E7' }}>
                                  <ValueDisplay fieldName={conflict.fieldName} value={opt.value} />
                                </span>
                                {opt.recommended && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: '1px 7px',
                                    background: 'rgba(213,0,28,0.12)', border: '1px solid rgba(213,0,28,0.3)',
                                    borderRadius: 99, color: '#D5001C', letterSpacing: '0.06em',
                                  }}>
                                    RECOMENDADO
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: '#52525B' }}>
                                  {opt.source} · {formatDate(opt.fileDate)}
                                </span>
                                {opt.reasoning && (
                                  <span style={{ fontSize: 10, color: '#71717A', fontStyle: 'italic' }}>
                                    "{opt.reasoning}"
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ⚠️ Needs Review */}
          {consolidated.needsReview.length > 0 && (
            <section>
              <SectionHeader
                emoji="🔍"
                title="Revisar — confiança média/baixa"
                count={consolidated.needsReview.length}
                bg="rgba(234,179,8,0.04)"
              />
              <div style={{ border: '1px solid rgba(234,179,8,0.12)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(234,179,8,0.03)' }}>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Campo</th>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Valor sugerido</th>
                      <th style={{ padding: '7px 12px', textAlign: 'left', fontSize: 9, color: '#52525B', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Fonte · Confiança</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidated.needsReview.map((nr, i) => {
                      const isComplex = Array.isArray(nr.value) || (typeof nr.value === 'object' && nr.value !== null);
                      return (
                        <tr key={nr.fieldName} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 12px', fontSize: 12, color: '#A1A1AA', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {label(nr.fieldName)}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: 12 }}>
                            {isComplex ? (
                              <span style={{ color: '#71717A', fontStyle: 'italic' }}>
                                {formatValue(nr.fieldName, nr.value)}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={reviewValues[nr.fieldName] ?? ''}
                                onChange={e => setReviewValues(prev => ({ ...prev, [nr.fieldName]: e.target.value }))}
                                style={{
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 5, padding: '4px 8px', color: '#E4E4E7', fontSize: 12,
                                  width: '100%', outline: 'none',
                                }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div>
                              <span style={{ fontSize: 10, color: '#52525B', display: 'block' }}>{nr.source}</span>
                              <span style={{
                                fontSize: 9, fontWeight: 700, padding: '1px 5px',
                                background: nr.confidence === 'medium' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${nr.confidence === 'medium' ? 'rgba(234,179,8,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                borderRadius: 99, color: nr.confidence === 'medium' ? '#EAB308' : '#EF4444',
                                letterSpacing: '0.06em',
                              }}>
                                {nr.confidence === 'medium' ? 'MÉDIO' : 'BAIXO'}
                              </span>
                              {nr.reasoning && (
                                <span style={{ display: 'block', fontSize: 10, color: '#3F3F46', marginTop: 2, fontStyle: 'italic' }}>
                                  {nr.reasoning.slice(0, 80)}{nr.reasoning.length > 80 ? '…' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ❌ Missing */}
          {priorityMissing.length > 0 && (
            <section>
              <SectionHeader
                emoji="❌"
                title="Não encontrados — preencha manualmente"
                count={priorityMissing.length + otherMissing.length}
                bg="rgba(239,68,68,0.05)"
              />
              <div style={{ border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {priorityMissing.map((fieldName, i) => (
                      <tr key={fieldName} style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 12, color: '#71717A', fontWeight: 500, whiteSpace: 'nowrap', width: 160 }}>
                          {label(fieldName)}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <input
                            type="text"
                            placeholder="Deixar em branco = Não disponível"
                            value={manualFills[fieldName] ?? ''}
                            onChange={e => setManualFills(prev => ({ ...prev, [fieldName]: e.target.value }))}
                            style={{
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 5, padding: '4px 8px', color: '#E4E4E7', fontSize: 12,
                              width: '100%', outline: 'none',
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {otherMissing.length > 0 && (
                <p style={{ fontSize: 10, color: '#3F3F46', marginTop: 8, paddingLeft: 4 }}>
                  Outros campos não encontrados: {otherMissing.map(f => label(f)).join(', ')}
                </p>
              )}
            </section>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <p style={{ fontSize: 11, color: '#F87171', marginBottom: 4 }}>
                Arquivos com erro de processamento (não incluídos):
              </p>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {errors.map(e => (
                  <li key={e} style={{ fontSize: 11, color: '#71717A', marginTop: 2 }}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.01)',
        }}>
          <p style={{ fontSize: 10, color: '#52525B', flex: 1 }}>
            Você pode editar qualquer campo antes de confirmar.
          </p>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 7,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              color: '#71717A', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 22px', borderRadius: 7,
              background: '#D5001C', border: 'none',
              color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all 0.15s ease',
            }}
          >
            Confirmar e abrir Dashboard
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
