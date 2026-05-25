import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  if (!code || !clientId || !clientSecret) return NextResponse.redirect(`${base}/?error=google_config`);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: `${base}/api/connect/googledrive/callback`, grant_type: 'authorization_code' }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return NextResponse.redirect(`${base}/?error=google_token`);

  const info = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })).json();
  const jar = await cookies();
  jar.set('gdrive_token', token.access_token, { httpOnly: true, maxAge: 3600, path: '/' });
  jar.set('gdrive_email', info.email ?? '', { httpOnly: false, maxAge: 3600, path: '/' });
  return new NextResponse('<script>window.close();</script>', { headers: { 'Content-Type': 'text/html' } });
}
