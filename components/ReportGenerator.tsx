'use client';

import { useState, useRef, useCallback } from 'react';
import { Project } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportConfig {
  clientName: string;
  period: string;
  preparedBy: string;
  language: 'pt' | 'en';
  selectedIds: Set<string>;
}

interface ProjectStatus {
  name: string;
  farol: string;
  manager: string;
  progress: number;
  spi: number | null;
  cpi: number | null;
  eacFormatted: string;
  eacDevPct: number | null;
  bacFormatted: string;
  situation: string;
  mainRisk: string;
  recommendedAction: string;
}

interface Report {
  executiveSummary: string;
  projectStatuses: ProjectStatus[];
  highlights: { positive: string[]; attention: string[] };
  nextSteps: { action: string; responsible: string; deadline: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FAROL_COLORS: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  verde:    { bg: '#dcfce7', text: '#166534', label: 'Verde',    dot: '🟢' },
  amarelo:  { bg: '#fef9c3', text: '#854d0e', label: 'Amarelo',  dot: '🟡' },
  vermelho: { bg: '#fee2e2', text: '#991b1b', label: 'Vermelho', dot: '🔴' },
  cinza:    { bg: '#f4f4f5', text: '#3f3f46', label: 'Cinza',    dot: '⚫' },
};

const INDEX_COLOR = (v: number | null) =>
  v == null ? '#6b7280' : v >= 0.95 ? '#166534' : v >= 0.85 ? '#854d0e' : '#991b1b';

function spiLabel(v: number | null) {
  if (v == null) return '—';
  return v >= 0.95 ? `${v.toFixed(2)} ✓` : v >= 0.85 ? `${v.toFixed(2)} ⚠` : `${v.toFixed(2)} ✗`;
}

// ─── Config form ─────────────────────────────────────────────────────────────

function ConfigForm({
  config, onChange, projects, onGenerate, loading,
}: {
  config: ReportConfig;
  onChange: (c: ReportConfig) => void;
  projects: Project[];
  onGenerate: () => void;
  loading: boolean;
}) {
  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7, color: '#E4E4E7', fontSize: 12, outline: 'none',
  };
  const label: React.CSSProperties = {
    fontSize: 10, letterSpacing: '0.12em', color: '#71717A',
    textTransform: 'uppercase', fontWeight: 600, marginBottom: 5, display: 'block',
  };

  const allSelected = projects.every(p => config.selectedIds.has(p.id));
  const toggleAll = () => {
    if (allSelected) onChange({ ...config, selectedIds: new Set() });
    else onChange({ ...config, selectedIds: new Set(projects.map(p => p.id)) });
  };
  const toggleProject = (id: string) => {
    const next = new Set(config.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange({ ...config, selectedIds: next });
  };

  const canGenerate = config.clientName.trim() && config.period.trim() && config.preparedBy.trim() && config.selectedIds.size > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Row 1: Client + Period + Author */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label style={label}>Nome do Cliente</label>
          <input style={field} value={config.clientName} placeholder="Ex: Infratech S.A."
            onChange={e => onChange({ ...config, clientName: e.target.value })} />
        </div>
        <div>
          <label style={label}>Período do Relatório</label>
          <input style={field} value={config.period} placeholder="Ex: Junho/2025"
            onChange={e => onChange({ ...config, period: e.target.value })} />
        </div>
        <div>
          <label style={label}>Preparado por</label>
          <input style={field} value={config.preparedBy} placeholder="Ex: João Silva"
            onChange={e => onChange({ ...config, preparedBy: e.target.value })} />
        </div>
      </div>

      {/* Row 2: Language + Generate button */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
        <div style={{ width: 160 }}>
          <label style={label}>Idioma</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['pt', 'en'] as const).map(lang => (
              <button key={lang} onClick={() => onChange({ ...config, language: lang })}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 600,
                  borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                  background: config.language === lang ? 'rgba(213,0,28,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${config.language === lang ? 'rgba(213,0,28,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: config.language === lang ? '#D5001C' : '#71717A',
                }}>
                {lang === 'pt' ? 'PT' : 'EN'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          style={{
            padding: '9px 28px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
            background: canGenerate && !loading ? '#D5001C' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${canGenerate && !loading ? '#D5001C' : 'rgba(255,255,255,0.1)'}`,
            color: canGenerate && !loading ? '#fff' : '#52525B',
            transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Gerando...
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
              Gerar Relatório
            </>
          )}
        </button>
      </div>

      {/* Project selector */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ ...label, margin: 0 }}>Projetos incluídos ({config.selectedIds.size}/{projects.length})</label>
          <button onClick={toggleAll} style={{ fontSize: 10, color: '#D5001C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {projects.map(p => {
            const checked = config.selectedIds.has(p.id);
            const farol = FAROL_COLORS[p.farol] ?? FAROL_COLORS.cinza;
            return (
              <button key={p.id} onClick={() => toggleProject(p.id)} style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                background: checked ? 'rgba(213,0,28,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${checked ? 'rgba(213,0,28,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: checked ? '#E4E4E7' : '#52525B', transition: 'all 0.12s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{ fontSize: 9 }}>{farol.dot}</span>
                {p.name}
              </button>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Report Preview ───────────────────────────────────────────────────────────

function ReportPreview({
  report, config, previewRef,
}: {
  report: Report;
  config: ReportConfig;
  previewRef: React.RefObject<HTMLDivElement | null>;
}) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const red = '#D5001C';

  return (
    <div
      ref={previewRef}
      style={{
        background: '#ffffff', color: '#111111',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        maxWidth: 794, margin: '0 auto',
        boxShadow: '0 4px 40px rgba(0,0,0,0.3)',
      }}
    >
      {/* ── Cover Page ── */}
      <div style={{ padding: '72px 64px', borderBottom: `4px solid ${red}`, minHeight: 360, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.25em', color: '#52525B', textTransform: 'uppercase', marginBottom: 4 }}>PORSCHE CONSULTING</p>
            <div style={{ width: 40, height: 3, background: red, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>{today}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, letterSpacing: '0.2em', color: red, textTransform: 'uppercase', marginBottom: 12 }}>PMO STATUS REPORT</p>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: '#111111', marginBottom: 8, lineHeight: 1.15 }}>{config.clientName}</h1>
          <p style={{ fontSize: 16, color: '#52525B', marginBottom: 32 }}>{config.period}</p>
          <div style={{ display: 'flex', gap: 32, fontSize: 12, color: '#6B7280' }}>
            <span><b style={{ color: '#374151' }}>Preparado por:</b> {config.preparedBy}</span>
            <span><b style={{ color: '#374151' }}>Projetos analisados:</b> {report.projectStatuses.length}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: 'Total Projetos', value: String(report.projectStatuses.length), color: '#374151' },
            { label: 'No Prazo', value: String(report.projectStatuses.filter(p => p.farol === 'verde').length), color: '#166534' },
            { label: 'Atenção', value: String(report.projectStatuses.filter(p => p.farol === 'amarelo').length), color: '#854d0e' },
            { label: 'Críticos', value: String(report.projectStatuses.filter(p => p.farol === 'vermelho').length), color: '#991b1b' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '12px 16px', background: '#F9FAFB', borderRadius: 8, borderTop: `3px solid ${s.color}` }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '48px 64px' }}>
        {/* ── Executive Summary ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: red, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${red}` }}>
            Sumário Executivo
          </h2>
          {report.executiveSummary.split('\n').filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, marginBottom: 12 }}>{para}</p>
          ))}
        </section>

        {/* ── KPI Summary Table ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: red, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${red}` }}>
            Resumo de KPIs por Projeto
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F3F4F6', borderBottom: '2px solid #E5E7EB' }}>
                {['Projeto', 'Farol', 'Progresso', 'SPI', 'CPI', 'BAC', 'EAC', 'Desvio'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B7280', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.projectStatuses.map((p, i) => {
                const farol = FAROL_COLORS[p.farol] ?? FAROL_COLORS.cinza;
                const devColor = p.eacDevPct == null ? '#6B7280' : p.eacDevPct <= 0 ? '#166534' : p.eacDevPct <= 10 ? '#854d0e' : '#991b1b';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827', maxWidth: 160 }}>{p.name}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: farol.bg, color: farol.text }}>
                        {farol.dot} {farol.label}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', color: '#374151' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 48, height: 4, background: '#E5E7EB', borderRadius: 99 }}>
                          <div style={{ height: '100%', width: `${Math.min(100, p.progress ?? 0)}%`, background: p.progress >= 80 ? '#166534' : p.progress >= 50 ? '#854d0e' : '#991b1b', borderRadius: 99 }} />
                        </div>
                        {p.progress ?? '—'}%
                      </div>
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: INDEX_COLOR(p.spi) }}>{spiLabel(p.spi)}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: INDEX_COLOR(p.cpi) }}>{p.cpi != null ? p.cpi.toFixed(2) : '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#374151' }}>{p.bacFormatted}</td>
                    <td style={{ padding: '9px 12px', color: '#374151' }}>{p.eacFormatted}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: devColor }}>
                      {p.eacDevPct != null ? `${p.eacDevPct > 0 ? '+' : ''}${p.eacDevPct.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* ── Status por Projeto ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: red, fontWeight: 700, marginBottom: 20, paddingBottom: 8, borderBottom: `2px solid ${red}` }}>
            Status por Projeto
          </h2>
          {report.projectStatuses.map((p, i) => {
            const farol = FAROL_COLORS[p.farol] ?? FAROL_COLORS.cinza;
            return (
              <div key={i} style={{ marginBottom: 24, padding: '18px 20px', border: '1px solid #E5E7EB', borderLeft: `4px solid ${p.farol === 'verde' ? '#22c55e' : p.farol === 'amarelo' ? '#eab308' : p.farol === 'vermelho' ? red : '#9CA3AF'}`, borderRadius: '0 8px 8px 0', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{farol.dot} {p.name}</h3>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>Gerente: {p.manager || '—'}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: farol.bg, color: farol.text }}>
                    {farol.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 10, flexWrap: 'wrap' }}>
                  {[
                    ['Avanço', `${p.progress ?? '—'}%`],
                    ['SPI', spiLabel(p.spi)],
                    ['CPI', p.cpi != null ? p.cpi.toFixed(2) : '—'],
                    ['EAC', p.eacFormatted + (p.eacDevPct != null ? ` (${p.eacDevPct > 0 ? '+' : ''}${p.eacDevPct.toFixed(1)}% vs BAC ${p.bacFormatted})` : '')],
                  ].map(([k, v]) => (
                    <span key={k} style={{ fontSize: 11 }}>
                      <b style={{ color: '#374151' }}>{k}: </b>
                      <span style={{ color: '#6B7280' }}>{v}</span>
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 8 }}><b>Situação:</b> {p.situation}</p>
                <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 6 }}>
                  <b style={{ color: '#991b1b' }}>Principal risco:</b> <span style={{ color: '#6B7280' }}>{p.mainRisk}</span>
                </p>
                <p style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  <b style={{ color: '#166534' }}>Ação recomendada:</b> <span style={{ color: '#6B7280' }}>{p.recommendedAction}</span>
                </p>
              </div>
            );
          })}
        </section>

        {/* ── Highlights ── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: red, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${red}` }}>
            Destaques do Período
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>✅ Pontos Positivos</p>
              {report.highlights.positive.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                  <span style={{ color: '#22c55e', flexShrink: 0 }}>•</span>
                  <p style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>⚠️ Pontos de Atenção</p>
              {report.highlights.attention.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, padding: '8px 12px', background: '#fefce8', border: '1px solid #fef08a', borderRadius: 6 }}>
                  <span style={{ color: '#eab308', flexShrink: 0 }}>•</span>
                  <p style={{ fontSize: 12, color: '#854d0e', lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Next Steps ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', color: red, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `2px solid ${red}` }}>
            Próximos Passos
          </h2>
          {report.nextSteps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 10, alignItems: 'flex-start', padding: '10px 16px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
              <span style={{ width: 24, height: 24, background: red, color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 3 }}>{step.action}</p>
                <p style={{ fontSize: 11, color: '#6B7280' }}>Responsável: <b style={{ color: '#374151' }}>{step.responsible}</b> · Prazo: <b style={{ color: '#374151' }}>{step.deadline}</b></p>
              </div>
            </div>
          ))}
        </section>

        {/* ── Footer ── */}
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>Porsche Consulting — Confidencial — {today}</p>
          <p style={{ fontSize: 10, color: '#9CA3AF' }}>PMO Intelligence Platform</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  projects: Project[];
}

export function ReportGenerator({ projects }: Props) {
  const [config, setConfig] = useState<ReportConfig>({
    clientName: '', period: '', preparedBy: '',
    language: 'pt',
    selectedIds: new Set(projects.map(p => p.id)),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [savedConfig, setSavedConfig] = useState<ReportConfig | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const selectedProjects = projects.filter(p => config.selectedIds.has(p.id));

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: selectedProjects, config }),
      });
      const data = await res.json() as { report?: Report; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? 'Erro desconhecido');
      setReport(data.report!);
      setSavedConfig({ ...config });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }, [selectedProjects, config]);

  const handleDownloadPDF = useCallback(async () => {
    if (!previewRef.current || !savedConfig) return;
    setPdfLoading(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        logging: false, allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      const footerH = 8;
      const usableH = pageH - footerH;
      const today = new Date().toLocaleDateString('pt-BR');

      let pos = 0;
      let pageNum = 1;
      while (pos < imgH) {
        if (pageNum > 1) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -pos, pageW, imgH);

        // footer stripe
        pdf.setFillColor(249, 250, 251);
        pdf.rect(0, pageH - footerH, pageW, footerH, 'F');
        pdf.setDrawColor(229, 231, 235);
        pdf.line(0, pageH - footerH, pageW, pageH - footerH);
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`Porsche Consulting — Confidencial — ${today}`, 10, pageH - 2.5);
        pdf.text(`${pageNum}`, pageW / 2, pageH - 2.5, { align: 'center' });
        pdf.text('PMO Intelligence Platform', pageW - 10, pageH - 2.5, { align: 'right' });

        pos += usableH;
        pageNum++;
      }

      const fileName = `PMO_Report_${savedConfig.clientName.replace(/\s+/g, '_')}_${savedConfig.period.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error('PDF error:', e);
      setError('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setPdfLoading(false);
    }
  }, [savedConfig]);

  if (projects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, textAlign: 'center', padding: 40 }}>
        <div style={{ width: 56, height: 56, background: 'rgba(213,0,28,0.08)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D5001C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14,2 14,8 20,8" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 8 }}>Carregue projetos primeiro</h2>
          <p style={{ fontSize: 13, color: '#52525B', maxWidth: 300, lineHeight: 1.6 }}>
            Faça upload de um arquivo PMO para gerar o Status Report executivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* ── Config section ── */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>
          Configuração do Relatório
        </p>
        <ConfigForm
          config={config}
          onChange={setConfig}
          projects={projects}
          onGenerate={handleGenerate}
          loading={loading}
        />
        {error && (
          <div style={{ marginTop: 12, padding: '8px 14px', background: 'rgba(213,0,28,0.08)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 7, fontSize: 12, color: '#F87171' }}>
            {error}
          </div>
        )}
      </div>

      {/* ── Preview section ── */}
      {report && savedConfig && (
        <div style={{ flex: 1, padding: '20px 24px', minHeight: 0 }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600 }}>
              Preview do Relatório
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* PPT — disabled */}
              <div style={{ position: 'relative', display: 'inline-block' }}
                title="Exportação PPT em breve">
                <button disabled style={{
                  padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#3F3F46', cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                  Baixar PPT
                  <span style={{ fontSize: 8, padding: '1px 5px', background: 'rgba(255,255,255,0.06)', borderRadius: 99, color: '#52525B' }}>Em breve</span>
                </button>
              </div>
              {/* PDF */}
              <button onClick={handleDownloadPDF} disabled={pdfLoading} style={{
                padding: '7px 18px', borderRadius: 7, fontSize: 12, fontWeight: 700,
                background: pdfLoading ? 'rgba(255,255,255,0.06)' : 'rgba(213,0,28,0.12)',
                border: `1px solid ${pdfLoading ? 'rgba(255,255,255,0.08)' : 'rgba(213,0,28,0.35)'}`,
                color: pdfLoading ? '#52525B' : '#D5001C', cursor: pdfLoading ? 'default' : 'pointer',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {pdfLoading
                  ? <><span style={{ width: 11, height: 11, border: '1.5px solid rgba(213,0,28,0.3)', borderTopColor: '#D5001C', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />Gerando PDF...</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Baixar PDF</>}
              </button>
            </div>
          </div>

          {/* Preview content */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            <ReportPreview report={report} config={savedConfig} previewRef={previewRef} />
          </div>
        </div>
      )}
    </div>
  );
}
