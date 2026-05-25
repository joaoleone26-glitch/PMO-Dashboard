'use client';

import { useState } from 'react';

type Provider = 'onedrive' | 'googledrive';
type ConnState = 'idle' | 'connecting' | 'connected' | 'error';

interface ProviderState { state: ConnState; email?: string; error?: string }

function ProviderButton({
  icon, label, hint, state, onConnect, onDisconnect
}: {
  icon: React.ReactNode; label: string; hint: string;
  state: ProviderState; onConnect: () => void; onDisconnect: () => void;
}) {
  const connected = state.state === 'connected';
  const loading = state.state === 'connecting';
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 9, border: `1px solid ${connected ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`,
      background: connected ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: connected ? 6 : 0 }}>
        <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#E4E4E7' }}>{label}</p>
          {!connected && <p style={{ fontSize: 10, color: '#52525B' }}>{hint}</p>}
          {connected && state.email && <p style={{ fontSize: 10, color: '#22C55E' }}>{state.email}</p>}
        </div>
        {connected ? (
          <button onClick={onDisconnect} style={{ fontSize: 10, color: '#52525B', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
            Desconectar
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 6,
              background: loading ? 'rgba(255,255,255,0.06)' : 'rgba(213,0,28,0.12)',
              border: `1px solid ${loading ? 'rgba(255,255,255,0.07)' : 'rgba(213,0,28,0.3)'}`,
              color: loading ? '#52525B' : '#D5001C', cursor: loading ? 'default' : 'pointer',
              transition: 'all 0.15s ease', flexShrink: 0,
            }}
          >
            {loading ? 'Aguardando...' : 'Conectar'}
          </button>
        )}
      </div>
      {state.state === 'error' && (
        <p style={{ fontSize: 10, color: '#F87171', marginTop: 4, lineHeight: 1.4 }}>{state.error}</p>
      )}
    </div>
  );
}

export function DataSourceConnector() {
  const [states, setStates] = useState<Record<Provider, ProviderState>>({
    onedrive: { state: 'idle' },
    googledrive: { state: 'idle' },
  });

  const connect = async (provider: Provider) => {
    setStates(s => ({ ...s, [provider]: { state: 'connecting' } }));
    try {
      const res = await fetch(`/api/connect/${provider}`);
      const data = await res.json();
      if (data.authUrl) {
        // open OAuth in popup
        const popup = window.open(data.authUrl, 'oauth', 'width=500,height=650,resizable=yes');
        const timer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(timer);
            // check if we got connected (token stored in cookie)
            fetch(`/api/connect/${provider}/status`).then(r => r.json()).then(d => {
              if (d.connected) {
                setStates(s => ({ ...s, [provider]: { state: 'connected', email: d.email } }));
              } else {
                setStates(s => ({ ...s, [provider]: { state: 'idle' } }));
              }
            });
          }
        }, 500);
      } else if (data.error) {
        setStates(s => ({ ...s, [provider]: { state: 'error', error: data.error } }));
      }
    } catch {
      setStates(s => ({
        ...s,
        [provider]: { state: 'error', error: 'Falha ao iniciar conexão. Verifique as variáveis de ambiente.' },
      }));
    }
  };

  const disconnect = (provider: Provider) => {
    fetch(`/api/connect/${provider}/disconnect`, { method: 'POST' });
    setStates(s => ({ ...s, [provider]: { state: 'idle' } }));
  };

  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 16px' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.18em', color: '#52525B', textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
        Fontes de Dados
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ProviderButton
          label="OneDrive / SharePoint"
          hint="Microsoft 365"
          state={states.onedrive}
          onConnect={() => connect('onedrive')}
          onDisconnect={() => disconnect('onedrive')}
          icon={
            <svg viewBox="0 0 21 16" width="22" height="17" fill="none">
              <path d="M12.9 5.8L9.2 2.2A5.3 5.3 0 003.3 5C1.4 5.4 0 7.1 0 9.1 0 11.3 1.8 13 4 13h13c1.7 0 3-1.3 3-3 0-1.5-1.1-2.8-2.6-3l-.5-1.2z" fill="#0078D4" opacity=".8"/>
              <path d="M8.5 6.2L6.1 4A3.5 3.5 0 002 5.9C.8 6.3 0 7.4 0 8.7 0 10.5 1.4 12 3.2 12h10.3c1.4 0 2.5-1 2.5-2.3 0-1.1-.8-2.1-1.9-2.3l-.4-1.2z" fill="#28A8E0" opacity=".9"/>
            </svg>
          }
        />
        <ProviderButton
          label="Google Drive"
          hint="Google Workspace"
          state={states.googledrive}
          onConnect={() => connect('googledrive')}
          onDisconnect={() => disconnect('googledrive')}
          icon={
            <svg viewBox="0 0 87.3 78" width="22" height="20" fill="none">
              <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066DA"/>
              <path d="M43.65 25L29.9 1.4c-1.35.8-2.5 1.9-3.3 3.3L1.2 48.5A9.06 9.06 0 000 53h27.5z" fill="#00AC47"/>
              <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.65 10.3z" fill="#EA4335"/>
              <path d="M43.65 25L57.4 1.4C56.05.6 54.5.2 52.95.2H34.35c-1.55 0-3.1.45-4.45 1.2z" fill="#00832D"/>
              <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.6c1.55 0 3.1-.45 4.45-1.2z" fill="#2684FC"/>
              <path d="M73.4 26.5l-13.5-23.4c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#FFBA00"/>
            </svg>
          }
        />
      </div>
    </div>
  );
}
