import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ connected: !!jar.get('gdrive_token')?.value, email: jar.get('gdrive_email')?.value });
}
