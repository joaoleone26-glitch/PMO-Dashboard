'use client';

export function Header() {
  return (
    <header
      style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0A0A0A' }}
      className="px-8 py-4 flex items-center justify-between flex-shrink-0"
    >
      {/* Left: Porsche Consulting */}
      <div className="flex items-center gap-4">
        <div
          style={{ background: '#D5001C', width: 36, height: 36 }}
          className="flex items-center justify-center flex-shrink-0"
        >
          <span style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'var(--font-geist-sans)' }}>P</span>
        </div>
        <div>
          <p style={{ letterSpacing: '0.22em', fontSize: 13, fontWeight: 700, color: '#FFFFFF' }} className="uppercase">
            Porsche Consulting
          </p>
          <p style={{ letterSpacing: '0.18em', fontSize: 10, color: '#52525B' }} className="uppercase mt-0.5">
            PMO Intelligence Platform
          </p>
        </div>
      </div>

      {/* Right: Client logo placeholder */}
      <div
        style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '8px 18px' }}
        className="flex items-center gap-3"
      >
        <div
          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', borderRadius: 4, border: '1px dashed rgba(255,255,255,0.18)' }}
          className="flex items-center justify-center"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        </div>
        <span style={{ fontSize: 12, color: '#52525B', letterSpacing: '0.06em' }}>Logo do Cliente</span>
      </div>
    </header>
  );
}
