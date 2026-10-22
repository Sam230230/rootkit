import type { NextRequest } from 'next/server';
import { sessionCookie, verifySession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await verifySession(request.cookies.get(sessionCookie)?.value);
  if (!session) return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return Response.json({ user: session });
}
