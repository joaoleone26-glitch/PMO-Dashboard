import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const base = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (error) {
    return new NextResponse(
      `<script>window.opener?.postMessage({type:'gdrive_error',error:'${error}'}, '*'); window.close();</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return new NextResponse(
      `<script>window.opener?.postMessage({type:'gdrive_error',error:'missing_config'}, '*'); window.close();</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const redirectUri = `${base}/api/connect/googledrive/callback`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });

  const token = await tokenRes.json();
  if (!token.access_token) {
    const msg = token.error_description ?? token.error ?? 'token_error';
    return new NextResponse(
      `<script>window.opener?.postMessage({type:'gdrive_error',error:'${msg}'}, '*'); window.close();</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const info = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })).json();

  const jar = await cookies();
  jar.set('gdrive_token', token.access_token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600, path: '/' });
  jar.set('gdrive_email', info.email ?? '', { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 3600, path: '/' });

  return new NextResponse(
    `<script>window.opener?.postMessage({type:'gdrive_ok',email:'${info.email ?? ''}'}, '*'); window.close();</script>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
