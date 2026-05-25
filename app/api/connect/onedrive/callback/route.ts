import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get('code');
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';
  const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  if (!code || !clientId || !clientSecret) return NextResponse.redirect(`${base}/?error=onedrive_config`);

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: `${base}/api/connect/onedrive/callback`, grant_type: 'authorization_code' }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return NextResponse.redirect(`${base}/?error=onedrive_token`);

  const me = await (await fetch('https://graph.microsoft.com/v1.0/me', { headers: { Authorization: `Bearer ${token.access_token}` } })).json();
  const jar = await cookies();
  jar.set('onedrive_token', token.access_token, { httpOnly: true, maxAge: 3600, path: '/' });
  jar.set('onedrive_email', me.mail ?? me.userPrincipalName ?? '', { httpOnly: false, maxAge: 3600, path: '/' });
  return new NextResponse('<script>window.close();</script>', { headers: { 'Content-Type': 'text/html' } });
}
