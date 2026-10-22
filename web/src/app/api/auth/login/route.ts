import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { verifyPassword } from '@/lib/password';
import { cookieOptions, sessionCookie, signSession } from '@/lib/session';

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  const loginId = typeof input?.loginId === 'string' ? input.loginId.trim() : '';
  const password = typeof input?.password === 'string' ? input.password : '';
  if (!loginId || !password || loginId.length > 50 || password.length > 200) {
    return Response.json({ error: '아이디와 비밀번호를 입력해 주세요.' }, { status: 422 });
  }
  const [user] = await db.select().from(users).where(eq(users.loginId, loginId)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  const session = { userId: user.id, loginId: user.loginId, name: user.name || user.loginId };
  const response = NextResponse.json({ user: { loginId: session.loginId, name: session.name } });
  response.cookies.set(sessionCookie, await signSession(session), cookieOptions(request));
  return response;
}
