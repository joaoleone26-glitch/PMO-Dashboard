'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Project, LoadedFile, FileUploadResult, ProjectFilters } from '@/lib/types';
import { Header } from '@/components/Header';
import { KPICards } from '@/components/KPICards';
import { FileUpload } from '@/components/FileUpload';
import { LoadedFiles } from '@/components/LoadedFiles';
import { DataSourceConnector } from '@/components/DataSourceConnector';
import { FilterPanel } from '@/components/FilterPanel';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ChatBox } from '@/components/ChatBox';

const SCurvePrazo = dynamic(() => import('@/components/charts/SCurvePrazo').then(m => m.SCurvePrazo), { ssr: false });
const SCurveCusto = dynamic(() => import('@/components/charts/SCurveCusto').then(m => m.SCurveCusto), { ssr: false });
const RiskMatrix  = dynamic(() => import('@/components/charts/RiskMatrix').then(m => m.RiskMatrix),   { ssr: false });

type Tab = 'dashboard' | 'chat';

const DEFAULT_FILTERS: ProjectFilters = { farol: 'all', phases: [], knowledgeAreas: [], dateStart: '', dateEnd: '' };

function applyFilters(projects: Project[], filters: ProjectFilters, selectedIds: Set<string>): Project[] {
  return projects.filter(p => {
    if (selectedIds.size > 0 && !selectedIds.has(p.id)) return false;
    if (filters.farol !== 'all' && p.farol !== filters.farol) return false;
    if (filters.phases.length > 0 && !filters.phases.includes(p.phase!)) return false;
    if (filters.knowledgeAreas.length > 0 && !filters.knowledgeAreas.includes(p.knowledgeArea!)) return false;
    // Overlap check: project period overlaps [dateStart, dateEnd]
    if (filters.dateStart && p.deadline && p.deadline < filters.dateStart) return false;
    if (filters.dateEnd && p.startDate && p.startDate > filters.dateEnd) return false;
    return true;
  });
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>{title}</p>
      {children}
    </div>
  );
}

export default function Home() {
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loadedFiles, setLoadedFiles]   = useState<LoadedFile[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<Tab>('dashboard');
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [filters, setFilters]           = useState<ProjectFilters>(DEFAULT_FILTERS);

  // Single source of truth: displayProjects = all filtered/selected projects
  // If nothing is selected yet (e.g., immediately after load before toggle) show all
  const noSelection = selectedProjectIds.size === 0;
  const displayProjects = applyFilters(
    projects,
    filters,
    noSelection ? new Set(projects.map(p => p.id)) : selectedProjectIds,
  );
  const selectedProject = projects.find(p => p.id === selectedId) ?? null;

  const handleFileProcessed = useCallback((result: FileUploadResult) => {
    const { fileName, format, projects: newProjects } = result;
    setProjects(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      return [...prev, ...newProjects.filter(p => !existingIds.has(p.id))];
    });
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      newProjects.forEach(p => next.add(p.id));
      return next;
    });
    const entry: LoadedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName, format, projectCount: newProjects.length,
      projectIds: newProjects.map(p => p.id), uploadedAt: new Date().toISOString(),
    };
    setLoadedFiles(prev => [...prev, entry]);
    if (!selectedId && newProjects.length > 0) setSelectedId(newProjects[0].id);
  }, [selectedId]);

  const handleRemoveFile = useCallback((fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (!file) return;
    const removedIds = new Set(file.projectIds);
    setProjects(prev => prev.filter(p => !removedIds.has(p.id)));
    setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedProjectIds(prev => { const next = new Set(prev); removedIds.forEach(id => next.delete(id)); return next; });
    if (selectedId && removedIds.has(selectedId)) setSelectedId(null);
  }, [loadedFiles, selectedId]);

  const handleToggleFile = useCallback((fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (!file) return;
    const allOn = file.projectIds.every(id => selectedProjectIds.has(id));
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (allOn) file.projectIds.forEach(id => next.delete(id));
      else file.projectIds.forEach(id => next.add(id));
      return next;
    });
  }, [loadedFiles, selectedProjectIds]);

  const handleToggleProject = useCallback((pid: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', gap: 16, height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
        <KPICards projects={displayProjects} />

        <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0, overflow: 'hidden' }}>

          {/* ─── Sidebar ─── */}
          <aside style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>

            {/* Upload manual */}
            <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
              <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>
                Upload Manual
              </p>
              <FileUpload onFileProcessed={handleFileProcessed} />
            </div>

            {/* Cloud connectors */}
            <DataSourceConnector onFileProcessed={handleFileProcessed} />

            {/* Loaded files */}
            <LoadedFiles
              files={loadedFiles}
              projects={projects}
              selectedProjectIds={selectedProjectIds}
              onRemove={handleRemoveFile}
              onToggleFile={handleToggleFile}
              onToggleProject={handleToggleProject}
            />

            {/* Filters */}
            <FilterPanel
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          </aside>

          {/* ─── Main panel ─── */}
          <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px', flexShrink: 0 }}>
              {([
                { key: 'dashboard' as Tab, label: 'Dashboard', icon: '▦' },
                { key: 'chat'      as Tab, label: 'Assistente IA', icon: '◎' },
              ]).map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  padding: '13px 16px', background: 'none', border: 'none',
                  borderBottom: `2px solid ${activeTab === t.key ? '#D5001C' : 'transparent'}`,
                  color: activeTab === t.key ? '#FFFFFF' : '#52525B',
                  fontSize: 12, fontWeight: activeTab === t.key ? 600 : 400,
                  cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1,
                }}>
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{t.icon}</span>
                  {t.label}
                  {t.key === 'chat' && projects.length > 0 && (
                    <span style={{ fontSize: 10, background: '#D5001C', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                      {displayProjects.length}
                    </span>
                  )}
                </button>
              ))}
              {projects.length > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, color: '#52525B' }}>
                  {displayProjects.length} de {projects.length} projeto{projects.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {activeTab === 'dashboard' ? (
                projects.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Charts row 1 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <ChartCard title="Curva S — Prazo (% Conclusão Acumulada)">
                        <SCurvePrazo projects={displayProjects} />
                      </ChartCard>
                      <ChartCard title="Curva S — Custo (CAPEX Acumulado R$ M)">
                        <SCurveCusto projects={displayProjects} />
                      </ChartCard>
                    </div>

                    {/* Charts row 2 */}
                    <div style={{ display: 'grid', gridTemplateColumns: selectedProject ? '1fr 1fr' : '1fr', gap: 14 }}>
                      <ChartCard title="Matriz de Riscos (Probabilidade × Impacto)">
                        <RiskMatrix projects={displayProjects} onSelectProject={setSelectedId} />
                      </ChartCard>
                      {selectedProject && (
                        <div style={{ background: '#0E0E0E', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '18px 20px', overflowY: 'auto', maxHeight: 380 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600 }}>
                              Detalhe do Projeto
                            </p>
                            <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', color: '#52525B', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                          </div>
                          <ProjectDetail project={selectedProject} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <ChatBox projects={displayProjects} totalProjects={projects.length} />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, textAlign: 'center', padding: 40 }}>
      <div style={{ width: 56, height: 56, background: 'rgba(213,0,28,0.08)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D5001C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 8 }}>Nenhum projeto carregado</h2>
        <p style={{ fontSize: 13, color: '#52525B', maxWidth: 360, lineHeight: 1.6 }}>
          Faça upload de um arquivo PMO ou conecte-se ao OneDrive / Google Drive na barra lateral.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 }}>
        {['CSV', 'Excel', 'JSON', 'PDF', 'DOCX', 'PPTX', 'XML', 'XER'].map(fmt => (
          <span key={fmt} style={{ fontSize: 11, padding: '3px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, color: '#71717A' }}>
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
