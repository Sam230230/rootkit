// 데모 계정 생성. 이미 있으면 건너뛴다.
import postgres from 'postgres';
import { hashPassword } from '../src/lib/password.ts';

const loginId = process.env.SEED_LOGIN_ID || 'rookie';
const password = process.env.SEED_PASSWORD || 'rootkit1234';
const name = process.env.SEED_NAME || '루키';

const sql = postgres(process.env.DATABASE_URL!);
const rows = await sql`insert into users (login_id, password_hash, name) values (${loginId}, ${await hashPassword(password)}, ${name}) on conflict (login_id) do nothing returning id`;
console.log(rows.length ? `seed: '${loginId}' 계정을 만들었습니다.` : `seed: '${loginId}' 계정이 이미 있습니다.`);
await sql.end();
