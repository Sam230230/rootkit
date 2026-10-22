import { evaluateDemo, hasAnswerKey } from '@/lib/demo-evaluation';
import { findExercise, type Draft } from '@/lib/learning';

export async function POST(request: Request) {
  try {
    const input = await request.json();
    const exercise = typeof input?.exerciseId === 'string' ? findExercise(input.exerciseId) : undefined;
    if (!exercise || !hasAnswerKey(exercise) || !input.answer || typeof input.answer !== 'object') {
      return Response.json({ error: '문제와 답안을 확인해 주세요.' }, { status: 422 });
    }
    const { answer } = input;
    if (typeof answer.subject !== 'string' || typeof answer.body !== 'string' || answer.subject.length > 200 || answer.body.length > 10000) {
      return Response.json({ error: '제목은 200자, 본문은 10,000자 이내로 작성해 주세요.' }, { status: 422 });
    }
    if (exercise.stage === 0) {
      const blanks = exercise.blanks || [];
      const choice = input.blankMode !== 'input';
      if (!Array.isArray(answer.blanks) || answer.blanks.length !== blanks.length || !answer.blanks.every((value: unknown, i: number) => typeof value === 'string' && value.trim() && value.length <= 40 && (!choice || blanks[i].options.includes(value)))) {
        return Response.json({ error: '모든 빈칸을 채워 주세요.' }, { status: 422 });
      }
    } else if (!answer.subject.trim() || !answer.body.trim()) {
      return Response.json({ error: '제목과 본문을 모두 작성해 주세요.' }, { status: 422 });
    }
    const draft: Draft = { subject: answer.subject.trim(), body: answer.body.trim(), blanks: exercise.stage === 0 ? answer.blanks.map((x: string) => x.trim()) : [] };
    return Response.json(evaluateDemo(exercise, draft));
  } catch {
    return Response.json({ error: '올바른 JSON 요청이 필요합니다.' }, { status: 400 });
  }
}
