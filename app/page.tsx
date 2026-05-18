'use client';

import { useState } from 'react';
import { Project } from '@/lib/types';
import { FileUpload } from '@/components/FileUpload';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectDetail } from '@/components/ProjectDetail';
import { ChatBox } from '@/components/ChatBox';
import { SummaryBar } from '@/components/SummaryBar';

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat'>('dashboard');
  const [filter, setFilter] = useState<string>('all');

  const selectedProject = projects.find(p => p.id === selectedId) || null;

  const handleProjectsLoaded = (newProjects: Project[]) => {
    setProjects(prev => {
      const existingIds = new Set(prev.map(p => p.id));
      const fresh = newProjects.filter(p => !existingIds.has(p.id));
      return [...prev, ...fresh];
    });
    if (newProjects.length > 0 && !selectedId) {
      setSelectedId(newProjects[0].id);
    }
  };

  const filteredProjects = projects.filter(p => {
    if (filter === 'all') return true;
    return p.farol === filter;
  });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">PMO Dashboard</h1>
            <p className="text-xs text-gray-500">Infraestrutura · Análise inteligente de projetos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Assistente IA
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-4 gap-4" style={{ height: 'calc(100vh - 57px)' }}>
        {/* Left Sidebar */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Upload */}
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Importar Dados PMO</h2>
            <FileUpload onProjectsLoaded={handleProjectsLoaded} />
          </div>

          {/* Filters */}
          {projects.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filtrar por Farol</h2>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
                  { key: 'verde', label: '🟢 No prazo', color: 'bg-emerald-100 text-emerald-800' },
                  { key: 'amarelo', label: '🟡 Atenção', color: 'bg-amber-100 text-amber-800' },
                  { key: 'vermelho', label: '🔴 Críticos', color: 'bg-red-100 text-red-800' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      filter === f.key ? `${f.color} ring-2 ring-offset-1 ring-gray-300` : f.color
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project List */}
          {filteredProjects.length > 0 && (
            <div className="space-y-2">
              {filteredProjects.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  selected={selectedId === p.id}
                  onClick={() => {
                    setSelectedId(p.id);
                    setActiveTab('dashboard');
                  }}
                />
              ))}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
          {activeTab === 'dashboard' ? (
            <>
              {projects.length > 0 && <SummaryBar projects={projects} />}
              <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {projects.length === 0 ? (
                  <EmptyState />
                ) : selectedProject ? (
                  <div className="h-full p-5 overflow-y-auto">
                    <ProjectDetail project={selectedProject} />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Selecione um projeto para ver os detalhes
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="border-b border-gray-100 px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm font-medium text-gray-700">Assistente PMO</span>
                {projects.length > 0 && (
                  <span className="text-xs text-gray-400">{projects.length} projeto(s) carregado(s)</span>
                )}
              </div>
              <div className="flex-1 min-h-0">
                <ChatBox projects={projects} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1">Nenhum projeto carregado</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Faça upload de um arquivo PMO em qualquer formato e a IA irá extrair automaticamente os projetos, faróis, KPIs e pontos de atenção.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {['CSV', 'Excel', 'JSON', 'PDF', 'DOCX'].map(fmt => (
          <span key={fmt} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1 font-medium">
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
