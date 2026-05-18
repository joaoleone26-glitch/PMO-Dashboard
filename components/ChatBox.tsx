'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatMessage, Project } from '@/lib/types';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {!isUser && (
        <div style={{ width: 28, height: 28, background: '#D5001C', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, alignSelf: 'flex-end' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>P</span>
        </div>
      )}
      <div style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        background: isUser ? '#D5001C' : 'rgba(255,255,255,0.05)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        color: isUser ? '#fff' : '#E4E4E7',
      }}>
        {message.content}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Quais projetos estão críticos?',
  'Resuma as dificuldades',
  'KPIs fora da meta?',
  'Pontos de atenção prioritários',
];

export function ChatBox({ projects, totalProjects }: { projects: Project[]; totalProjects: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'init',
    role: 'assistant',
    content: 'Olá! Carregue um arquivo PMO para começar. Poderei responder perguntas sobre faróis, KPIs, riscos e orçamento dos projetos.',
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (projects.length > 0) {
      setMessages(prev => {
        if (prev.some(m => m.id !== 'init')) return prev;
        return [{ id: 'init', role: 'assistant', content: `${projects.length} projeto(s) carregado(s). Pergunte sobre faróis, KPIs, riscos, orçamento ou qualquer aspecto dos projetos.`, timestamp: new Date().toISOString() }];
      });
    }
  }, [projects.length]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, projects, history: messages.filter(m => m.id !== 'init') }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: data.reply || data.error || 'Erro', timestamp: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { id: `e-${Date.now()}`, role: 'assistant', content: 'Erro de conexão.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Context badge */}
      {totalProjects > 0 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#52525B' }}>Contexto:</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: projects.length < totalProjects ? '#F59E0B' : '#22C55E',
            background: projects.length < totalProjects ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
            border: `1px solid ${projects.length < totalProjects ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
            borderRadius: 99, padding: '2px 8px',
          }}>
            Analisando {projects.length} de {totalProjects} projeto{totalProjects !== 1 ? 's' : ''} selecionado{totalProjects !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(0,0,0,0.2)' }}>
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#D5001C', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>P</span>
            </div>
            <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px 14px 14px 2px' }}>
              {[0, 150, 300].map(delay => (
                <span key={delay} style={{ width: 6, height: 6, borderRadius: '50%', background: '#D5001C', display: 'inline-block', animation: 'bounce 1.2s infinite', animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setInput(s); inputRef.current?.focus(); }} style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(213,0,28,0.08)', border: '1px solid rgba(213,0,28,0.2)', borderRadius: 99, color: '#D5001C', cursor: 'pointer', transition: 'all 0.15s ease' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte sobre os projetos..."
            rows={1}
            disabled={loading}
            style={{
              flex: 1,
              resize: 'none',
              fontSize: 13,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '10px 14px',
              color: '#FFFFFF',
              outline: 'none',
              maxHeight: 96,
              minHeight: 40,
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 40,
              height: 40,
              background: input.trim() && !loading ? '#D5001C' : 'rgba(255,255,255,0.06)',
              border: 'none',
              borderRadius: 10,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.18s ease',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p style={{ fontSize: 10, color: '#3F3F46', marginTop: 6, textAlign: 'center' }}>Enter para enviar · Shift+Enter para nova linha</p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
        textarea::placeholder { color: #3F3F46; }
        textarea:focus { border-color: rgba(213,0,28,0.4) !important; }
      `}</style>
    </div>
  );
}
