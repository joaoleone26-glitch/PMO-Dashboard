import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const base = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  if (error) {
    return new NextResponse(
      `<script>window.opener?.postMessage({type:'onedrive_error',error:'${error}'}, '*'); window.close();</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';

  if (!code || !clientId || !clientSecret) {
    return new NextResponse(
      `<script>window.opener?.postMessage({type:'onedrive_error',error:'missing_config'}, '*'); window.close();</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const redirectUri = `${base}/api/connect/onedrive/callback`;

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      code, redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  });

  const token = await tokenRes.json();
  if (!token.access_token) {
    const msg = token.error_description ?? token.error ?? 'token_error';
    return new NextResponse(
      `<script>window.opener?.postMessage({type:'onedrive_error',error:'${msg}'}, '*'); window.close();</script>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }

  const me = await (await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })).json();

  const jar = await cookies();
  jar.set('onedrive_token', token.access_token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600, path: '/' });
  jar.set('onedrive_email', me.mail ?? me.userPrincipalName ?? '', { httpOnly: false, secure: true, sameSite: 'lax', maxAge: 3600, path: '/' });

  return new NextResponse(
    `<script>window.opener?.postMessage({type:'onedrive_ok',email:'${me.mail ?? me.userPrincipalName ?? ''}'}, '*'); window.close();</script>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
