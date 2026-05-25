import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const redirectUri = `${base}/api/connect/onedrive/callback`;

  if (!clientId) return NextResponse.json({ error: 'Configure MICROSOFT_CLIENT_ID nas variáveis de ambiente do Vercel.' }, { status: 503 });

  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: 'Files.Read.All Sites.Read.All offline_access User.Read', response_mode: 'query' });
  return NextResponse.json({ authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}` });
}
