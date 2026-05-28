'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileUploadResult } from '@/lib/types';
import { DriveFileBrowser } from './DriveFileBrowser';

type Provider = 'onedrive' | 'googledrive';
type ConnState = 'idle' | 'connecting' | 'connected' | 'error';
interface ProviderState { state: ConnState; email?: string; error?: string }

const MSG_TYPES: Record<Provider, { ok: string; error: string }> = {
  onedrive:    { ok: 'onedrive_ok',  error: 'onedrive_error'  },
  googledrive: { ok: 'gdrive_ok',    error: 'gdrive_error'    },
};

function ProviderButton({ icon, label, hint, state, onConnect, onDisconnect }: {
  icon: React.ReactNode; label: string; hint: string;
  state: ProviderState; onConnect: () => void; onDisconnect: () => void;
}) {
  const connected = state.state === 'connected';
  const loading   = state.state === 'connecting';
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 9, transition: 'all 0.15s ease',
      border: `1px solid ${connected ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`,
      background: connected ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#E4E4E7' }}>{label}</p>
          {connected && state.email
            ? <p style={{ fontSize: 10, color: '#22C55E' }}>{state.email}</p>
            : <p style={{ fontSize: 10, color: '#52525B' }}>{hint}</p>
          }
        </div>
        {connected ? (
          <button onClick={onDisconnect} style={{ fontSize: 10, color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>
            Desconectar
          </button>
        ) : (
          <button onClick={onConnect} disabled={loading} style={{
            fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6, flexShrink: 0,
            background: loading ? 'rgba(255,255,255,0.06)' : 'rgba(213,0,28,0.12)',
            border: `1px solid ${loading ? 'rgba(255,255,255,0.07)' : 'rgba(213,0,28,0.3)'}`,
            color: loading ? '#52525B' : '#D5001C', cursor: loading ? 'default' : 'pointer',
            transition: 'all 0.15s ease',
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, border: '1.5px solid rgba(213,0,28,0.3)', borderTopColor: '#D5001C', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                Aguardando...
              </span>
            ) : 'Conectar'}
          </button>
        )}
      </div>
      {state.state === 'error' && state.error && (
        <p style={{ fontSize: 10, color: '#F87171', marginTop: 6, lineHeight: 1.5, padding: '6px 8px', background: 'rgba(248,113,113,0.07)', borderRadius: 6 }}>
          {state.error}
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

interface Props {
  onFileProcessed: (result: FileUploadResult) => void;
}

export function DataSourceConnector({ onFileProcessed }: Props) {
  const [states, setStates] = useState<Record<Provider, ProviderState>>({
    onedrive:    { state: 'idle' },
    googledrive: { state: 'idle' },
  });

  // Restore existing connections on mount (e.g. after page refresh)
  useEffect(() => {
    Promise.all([
      fetch('/api/connect/onedrive/status').then(r => r.json()).catch(() => ({})),
      fetch('/api/connect/googledrive/status').then(r => r.json()).catch(() => ({})),
    ]).then(([od, gd]) => {
      setStates(s => ({
        ...s,
        ...(od?.connected ? { onedrive: { state: 'connected', email: od.email } } : {}),
        ...(gd?.connected ? { googledrive: { state: 'connected', email: gd.email } } : {}),
      }));
    });
  }, []);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      for (const [provider, types] of Object.entries(MSG_TYPES) as [Provider, typeof MSG_TYPES[Provider]][]) {
        if (event.data?.type === types.ok) {
          setStates(s => ({ ...s, [provider]: { state: 'connected', email: event.data.email } }));
        }
        if (event.data?.type === types.error) {
          const msg = errorMessage(provider, event.data.error);
          setStates(s => ({ ...s, [provider]: { state: 'error', error: msg } }));
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const connect = useCallback(async (provider: Provider) => {
    setStates(s => ({ ...s, [provider]: { state: 'connecting' } }));
    try {
      const res = await fetch(`/api/connect/${provider}`);
      const data = await res.json();
      if (data.error) {
        setStates(s => ({ ...s, [provider]: { state: 'error', error: data.error } }));
        return;
      }
      if (data.authUrl) {
        const popup = window.open(data.authUrl, 'oauth', 'width=520,height=680,resizable=yes,scrollbars=yes');
        if (!popup) {
          window.location.href = data.authUrl;
          return;
        }
        const timeout = setTimeout(() => {
          setStates(s => s[provider].state === 'connecting' ? { ...s, [provider]: { state: 'idle' } } : s);
        }, 180_000);
        const cleanup = setInterval(() => {
          if (popup.closed) { clearInterval(cleanup); clearTimeout(timeout); }
        }, 1000);
      }
    } catch {
      setStates(s => ({ ...s, [provider]: { state: 'error', error: 'Falha de rede ao iniciar conexão.' } }));
    }
  }, []);

  const disconnect = useCallback((provider: Provider) => {
    fetch(`/api/connect/${provider}/disconnect`, { method: 'POST' });
    setStates(s => ({ ...s, [provider]: { state: 'idle' } }));
  }, []);

  const gdriveConnected = states.googledrive.state === 'connected';

  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
        Fontes de Dados
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ProviderButton
          label="OneDrive / SharePoint" hint="Microsoft 365"
          state={states.onedrive}
          onConnect={() => connect('onedrive')}
          onDisconnect={() => disconnect('onedrive')}
          icon={<svg viewBox="0 0 21 16" width="22" height="17" fill="none">
            <path d="M12.9 5.8L9.2 2.2A5.3 5.3 0 003.3 5C1.4 5.4 0 7.1 0 9.1 0 11.3 1.8 13 4 13h13c1.7 0 3-1.3 3-3 0-1.5-1.1-2.8-2.6-3l-.5-1.2z" fill="#0078D4" opacity=".8"/>
            <path d="M8.5 6.2L6.1 4A3.5 3.5 0 002 5.9C.8 6.3 0 7.4 0 8.7 0 10.5 1.4 12 3.2 12h10.3c1.4 0 2.5-1 2.5-2.3 0-1.1-.8-2.1-1.9-2.3l-.4-1.2z" fill="#28A8E0" opacity=".9"/>
          </svg>}
        />

        <div>
          <ProviderButton
            label="Google Drive" hint="Google Workspace"
            state={states.googledrive}
            onConnect={() => connect('googledrive')}
            onDisconnect={() => disconnect('googledrive')}
            icon={<svg viewBox="0 0 87.3 78" width="22" height="20" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.65 10.3z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.95.2H34.35c-1.55 0-3.1.45-4.45 1.2z" fill="#00832D"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.6c1.55 0 3.1-.45 4.45-1.2z" fill="#2684FC"/>
              <path d="M73.4 26.5l-13.5-23.4c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
            </svg>}
          />
          {gdriveConnected && (
            <DriveFileBrowser onFileProcessed={onFileProcessed} />
          )}
        </div>
      </div>
    </div>
  );
}

function errorMessage(provider: Provider, code: string): string {
  if (code === 'missing_config') {
    const vars = provider === 'onedrive'
      ? 'MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET e NEXTAUTH_URL'
      : 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e NEXTAUTH_URL';
    return `Variáveis não configuradas: ${vars}. Acesse Vercel → Settings → Environment Variables.`;
  }
  if (code === 'access_denied') return 'Acesso negado pelo usuário.';
  return `Erro de autenticação: ${code}`;
}
