'use client';

import { useState } from 'react';
import { Project, LoadedFile, FileUploadResult } from '@/lib/types';
import { Header } from '@/components/Header';
import { KPICards } from '@/components/KPICards';
import { FileUpload } from '@/components/FileUpload';
import { LoadedFiles } from '@/components/LoadedFiles';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ChatBox } from '@/components/ChatBox';

type Tab = 'dashboard' | 'chat';
type Filter = 'all' | 'verde' | 'amarelo' | 'vermelho';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  const activeProjects = projects.filter(p => selectedProjectIds.has(p.id));
  const selectedProject = activeProjects.find(p => p.id === selectedId) || projects.find(p => p.id === selectedId) || null;
  const filteredProjects = projects.filter(p => filter === 'all' || p.farol === filter);

  // ── Fix: setSelectedId is called OUTSIDE the setProjects updater.
  // Calling setState inside another setState's updater is forbidden in React
  // and caused the state to not persist correctly.
  const handleFileProcessed = (result: FileUploadResult) => {
    const { fileName, format, projects: newProjects } = result;

    // Deduplicate by id before merging
    setProjects(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const fresh = newProjects.filter(p => !existingIds.has(p.id));
      return [...prev, ...fresh];
    });

    // Auto-select all new project IDs
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      newProjects.forEach(p => next.add(p.id));
      return next;
    });

    // Track the loaded file
    const fileEntry: LoadedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName,
      format,
      projectCount: newProjects.length,
      projectIds: newProjects.map(p => p.id),
      uploadedAt: new Date().toISOString(),
    };
    setLoadedFiles(prev => [...prev, fileEntry]);

    // Auto-select first project only when nothing is selected yet
    if (!selectedId && newProjects.length > 0) {
      setSelectedId(newProjects[0].id);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (!file) return;

    const removedIds = new Set(file.projectIds);

    setProjects(prev => prev.filter(p => !removedIds.has(p.id)));
    setLoadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      removedIds.forEach(id => next.delete(id));
      return next;
    });

    if (selectedId && removedIds.has(selectedId)) {
      setSelectedId(null);
    }
  };

  const handleToggleFile = (fileId: string) => {
    const file = loadedFiles.find(f => f.id === fileId);
    if (!file) return;
    const allOn = file.projectIds.every(id => selectedProjectIds.has(id));
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (allOn) {
        file.projectIds.forEach(id => next.delete(id));
      } else {
        file.projectIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId); else next.add(projectId);
      return next;
    });
  };

  const filterButtons: { key: Filter; label: string; color: string; activeColor: string }[] = [
    { key: 'all',      label: 'Todos', color: 'rgba(255,255,255,0.08)', activeColor: 'rgba(255,255,255,0.15)' },
    { key: 'verde',    label: '🟢',    color: 'rgba(34,197,94,0.08)',   activeColor: 'rgba(34,197,94,0.2)'   },
    { key: 'amarelo',  label: '🟡',    color: 'rgba(245,158,11,0.08)', activeColor: 'rgba(245,158,11,0.2)'  },
    { key: 'vermelho', label: '🔴',    color: 'rgba(213,0,28,0.08)',   activeColor: 'rgba(213,0,28,0.2)'    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px', gap: 20, minHeight: 0, height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
        {/* KPI row */}
        <KPICards projects={activeProjects.length > 0 ? activeProjects : projects} />

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0, overflow: 'hidden' }}>

          {/* Sidebar */}
          <aside style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

            {/* Upload zone */}
            <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px' }}>
              <FileUpload onFileProcessed={handleFileProcessed} />
            </div>

            {/* Loaded files list */}
            <LoadedFiles
              files={loadedFiles}
              projects={projects}
              selectedProjectIds={selectedProjectIds}
              onRemove={handleRemoveFile}
              onToggleFile={handleToggleFile}
              onToggleProject={handleToggleProject}
            />

            {/* Filter + project list */}
            {projects.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {filterButtons.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      style={{
                        flex: 1, padding: '5px 0',
                        border: `1px solid ${filter === f.key ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
                        borderRadius: 7,
                        background: filter === f.key ? f.activeColor : f.color,
                        color: '#A1A1AA', fontSize: 11, cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        fontWeight: filter === f.key ? 600 : 400,
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {filteredProjects.map(p => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      selected={selectedId === p.id}
                      onClick={() => { setSelectedId(p.id); setActiveTab('dashboard'); }}
                    />
                  ))}
                  {filteredProjects.length === 0 && (
                    <p style={{ fontSize: 12, color: '#3F3F46', textAlign: 'center', padding: '16px 0' }}>
                      Nenhum projeto neste filtro
                    </p>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Main panel */}
          <main style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', background: '#111111',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
          }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 20px', flexShrink: 0 }}>
              {([
                { key: 'dashboard' as Tab, label: 'Dashboard',    icon: '▦' },
                { key: 'chat'      as Tab, label: 'Assistente IA', icon: '◎' },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '14px 18px', background: 'none', border: 'none',
                    borderBottom: `2px solid ${activeTab === t.key ? '#D5001C' : 'transparent'}`,
                    color: activeTab === t.key ? '#FFFFFF' : '#52525B',
                    fontSize: 12, fontWeight: activeTab === t.key ? 600 : 400,
                    cursor: 'pointer', letterSpacing: '0.04em',
                    transition: 'all 0.15s ease',
                    display: 'flex', alignItems: 'center', gap: 7, marginBottom: -1,
                  }}
                >
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{t.icon}</span>
                  {t.label}
                  {t.key === 'chat' && projects.length > 0 && (
                    <span style={{ fontSize: 10, background: '#D5001C', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                      {projects.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {activeTab === 'dashboard' ? (
                <div style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
                  {projects.length === 0 ? (
                    <EmptyState />
                  ) : selectedProject ? (
                    <ProjectDetail project={selectedProject} />
                  ) : (
                    <p style={{ color: '#3F3F46', fontSize: 13, textAlign: 'center', paddingTop: 40 }}>
                      Selecione um projeto na lista
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ height: '100%' }}>
                  <ChatBox projects={activeProjects.length > 0 ? activeProjects : projects} totalProjects={projects.length} />
                </div>
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
        <p style={{ fontSize: 13, color: '#52525B', maxWidth: 340, lineHeight: 1.6 }}>
          Faça upload de um arquivo PMO na barra lateral. A IA extrai automaticamente faróis, KPIs, dificuldades e pontos de atenção.
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 }}>
        {['CSV', 'Excel', 'JSON', 'PDF', 'DOCX'].map(fmt => (
          <span key={fmt} style={{ fontSize: 11, padding: '3px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99, color: '#71717A' }}>
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
