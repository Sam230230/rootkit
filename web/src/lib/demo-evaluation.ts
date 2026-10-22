import { type Draft, type Evaluation, type Stage, exercises } from './learning';

// Deterministic demo rules, not an AI assessment. Keep answer keys on the server.
export function evaluateDemo(stage: Stage, answer: Draft): Evaluation {
  if (stage === 0) {
    const correct = ['Could you please', 'by', 'Please let me know'];
    const comments = ['Could you please로 요청하면 더 정중해요.', 'by는 해당 시점까지 완료해 달라는 뜻이에요.', 'Please let me know는 상대방의 회신을 요청하는 표현이에요.'];
    const checks = correct.map((value, i) => ({ label: exercises[0].requirements[i], passed: answer.blanks[i] === value }));
    const scores = checks.map((check, i) => ({ label: check.label, score: check.passed ? [40, 30, 30][i] : 0, max: [40, 30, 30][i], comment: comments[i] }));
    return { total: scores.reduce((n, x) => n + x.score, 0), summary: checks.every(x => x.passed) ? '세 가지 표현을 모두 완성했어요. 이제 직접 문장을 다듬어 볼까요?' : '문맥에 맞는 표현을 확인하고 다시 도전해 보세요.', scores, feedback: checks.flatMap((x, i) => x.passed ? [] : [comments[i]]), checks, mode: 'demo' };
  }
  const body = answer.body.toLowerCase();
  const polite = /could you|would you|would it|please/.test(body);
  const structured = /^(hi|dear|hello)\b/i.test(answer.body.trim()) && /regards|sincerely|thank/.test(body);
  const checks = stage === 1 ? [
    { label: '이번 달 영업 자료와 회의 목적', passed: /this month/.test(body) && /sales/.test(body) && /report|data/.test(body) && /meeting/.test(body) },
    { label: '금요일 오전 10시(KST) 기한', passed: /friday/.test(body) && /10\s*(a\.?m\.?|:00\s*(a\.?m\.?)?)/.test(body) && /kst/.test(body) },
    { label: '정중한 요청과 일정 조율', passed: polite && /let me know|more time|work for you/.test(body) },
  ] : [
    { label: '변경 사유와 사과', passed: /internal|scheduling conflict/.test(body) && /sorry|apolog|apologis/.test(body) },
    { label: '11월 5일 오후 3시(KST) 제안', passed: /november\s+5|nov\.?\s+5|5\s+november/.test(body) && /3\s*(p\.?m\.?|:00\s*p\.?m\.?)|15:00/.test(body) && /kst/.test(body) },
    { label: '가능 여부 회신 요청', passed: /let me know|work for you|confirm|available/.test(body) },
  ];
  const english = /[a-z]{2,}/i.test(body);
  const longEnough = body.trim().split(/\s+/).length >= 25;
  const scores = [
    { label: '필수 정보', score: Math.round(checks.filter(x => x.passed).length / 3 * 40), max: 40, comment: '예시 키워드로 필수 정보를 확인합니다. 의미가 같아도 인식하지 못할 수 있어요.' },
    { label: '문서 구성', score: structured ? 20 : 10, max: 20, comment: structured ? '인사와 마무리 표현이 포함되어 있어요.' : '인사와 마무리 표현을 확인해 보세요.' },
    { label: '정중한 표현', score: polite ? 20 : 5, max: 20, comment: polite ? '정중한 요청 표현을 사용했어요.' : 'Could you please… 같은 표현을 추가해 보세요.' },
    { label: '작성 분량', score: english && longEnough ? 20 : english ? 10 : 0, max: 20, comment: '데모에서는 영어 포함 여부와 25단어 이상인지 확인합니다. 문법 평가는 하지 않습니다.' },
  ];
  return { total: scores.reduce((n, x) => n + x.score, 0), summary: '작성한 이메일을 돌아보세요. 데모 점수는 단순 규칙으로 계산하며 실제 AI 평가가 아닙니다.', scores, feedback: checks.filter(x => !x.passed).map(x => `${x.label}: 내용이 포함되었는지 확인해 주세요.`), checks, mode: 'demo' };
}
