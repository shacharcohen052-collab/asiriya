import { NextResponse } from 'next/server';

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured' },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey }, { headers: { 'Cache-Control': 'no-store' } });
}
