import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const base = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (!clientId) {
    return NextResponse.json({
      error: 'Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis de ambiente do Vercel. Adicione também NEXTAUTH_URL=https://pmo-dashboard-9idd.vercel.app',
    }, { status: 503 });
  }

  const redirectUri = `${base}/api/connect/googledrive/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state: Buffer.from(Date.now().toString()).toString('base64'),
  });

  return NextResponse.json({
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    redirectUri,
  });
}
