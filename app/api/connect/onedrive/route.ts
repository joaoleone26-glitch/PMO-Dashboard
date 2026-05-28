import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';
  const base = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (!clientId) {
    return NextResponse.json({
      error: 'Configure MICROSOFT_CLIENT_ID e MICROSOFT_CLIENT_SECRET nas variáveis de ambiente do Vercel (Settings → Environment Variables). Adicione também NEXTAUTH_URL=https://pmo-dashboard-9idd.vercel.app',
    }, { status: 503 });
  }

  const redirectUri = `${base}/api/connect/onedrive/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'Files.Read.All Sites.Read.All offline_access User.Read',
    response_mode: 'query',
    state: Buffer.from(Date.now().toString()).toString('base64'),
  });

  return NextResponse.json({
    authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`,
    redirectUri,
  });
}
