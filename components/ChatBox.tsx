'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChatMessage, Project } from '@/lib/types';

interface Props {
  projects: Project[];
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatBox({ projects }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: projects.length > 0
        ? `Olá! Tenho acesso a ${projects.length} projeto(s) carregado(s). Posso responder perguntas como:\n\n• Quais projetos estão com farol vermelho?\n• Quais são os principais riscos?\n• Como está o orçamento do projeto X?\n• Quais KPIs estão fora da meta?`
        : 'Olá! Carregue um arquivo PMO para começar. Assim posso responder perguntas sobre os projetos.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update initial message when projects change
  useEffect(() => {
    if (projects.length > 0) {
      setMessages(prev => {
        const hasRealMessages = prev.some(m => m.id !== 'init');
        if (hasRealMessages) return prev;
        return [{
          id: 'init',
          role: 'assistant',
          content: `${projects.length} projeto(s) carregado(s). Pergunte sobre faróis, KPIs, riscos, orçamento ou qualquer aspecto dos projetos!`,
          timestamp: new Date().toISOString(),
        }];
      });
    }
  }, [projects.length]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          projects,
          history: messages.filter(m => m.id !== 'init'),
        }),
      });

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || data.error || 'Erro ao obter resposta',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'Erro de conexão. Tente novamente.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const suggestions = [
    'Quais projetos estão críticos?',
    'Resuma as dificuldades',
    'Quais KPIs estão fora da meta?',
    'Pontos de atenção prioritários',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(m => <MessageBubble key={m.id} message={m} />)}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); inputRef.current?.focus(); }}
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Pergunte sobre os projetos..."
            rows={1}
            className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-24"
            style={{ minHeight: '40px' }}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 bg-blue-600 text-white rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1 text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  );
}
