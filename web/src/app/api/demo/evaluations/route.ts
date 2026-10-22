import { evaluateDemo } from '@/lib/demo-evaluation';
import { blanks, isStage, type Draft } from '@/lib/learning';

export async function POST(request: Request) {
  try {
    const input = await request.json();
    if (!input || !isStage(input.stage) || !input.answer || typeof input.answer !== 'object') {
      return Response.json({ error: '단계와 답안을 확인해 주세요.' }, { status: 422 });
    }
    const { stage, answer } = input;
    if (typeof answer.subject !== 'string' || typeof answer.body !== 'string' || answer.subject.length > 200 || answer.body.length > 10000) {
      return Response.json({ error: '제목은 200자, 본문은 10,000자 이내로 작성해 주세요.' }, { status: 422 });
    }
    if (stage === 0) {
      if (!Array.isArray(answer.blanks) || answer.blanks.length !== 3 || !answer.blanks.every((value: unknown, i: number) => typeof value === 'string' && blanks[i].options.includes(value))) {
        return Response.json({ error: '세 개의 빈칸을 모두 선택해 주세요.' }, { status: 422 });
      }
    } else if (!answer.subject.trim() || !answer.body.trim()) {
      return Response.json({ error: '제목과 본문을 모두 작성해 주세요.' }, { status: 422 });
    }
    const draft: Draft = { subject: answer.subject.trim(), body: answer.body.trim(), blanks: stage === 0 ? answer.blanks : [] };
    return Response.json(evaluateDemo(stage, draft));
  } catch {
    return Response.json({ error: '올바른 JSON 요청이 필요합니다.' }, { status: 400 });
  }
}
