import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export async function POST() {
  const jar = await cookies();
  jar.delete('onedrive_token'); jar.delete('onedrive_email');
  return NextResponse.json({ ok: true });
}
