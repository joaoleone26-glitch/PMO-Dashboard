import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ connected: !!jar.get('onedrive_token')?.value, email: jar.get('onedrive_email')?.value });
}
