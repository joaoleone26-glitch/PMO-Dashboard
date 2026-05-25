import { NextResponse } from 'next/server';
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  if (!clientId) return NextResponse.json({ error: 'Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET nas variáveis de ambiente do Vercel.' }, { status: 503 });
  const params = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: `${base}/api/connect/googledrive/callback`, scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email', access_type: 'offline', prompt: 'consent' });
  return NextResponse.json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
}
