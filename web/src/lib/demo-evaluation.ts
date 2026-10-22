import { type Draft, type Evaluation, type Exercise } from './learning';

// Deterministic demo rules, not an AI assessment. Keep answer keys on the server.
const blankKeys: Record<string, { answers: string[][]; comments: string[] }> = {
  'b-sales-report': {
    answers: [['could you please'], ['by'], ['please let me know']],
    comments: ['Could you please로 요청하면 더 정중해요.', 'by는 해당 시점까지 완료해 달라는 뜻이에요.', 'Please let me know는 상대방의 회신을 요청하는 표현이에요.'],
  },
  'b-agenda': {
    answers: [['writing'], ['find'], ['attached']],
    comments: ["I'm writing to ~ 는 메일의 목적을 밝힐 때 쓰는 표현이에요.", 'Please find ~ attached는 첨부 파일을 안내하는 관용 표현이에요.', '첨부된 상태를 나타내므로 과거분사 attached를 써요.'],
  },
  'b-thanks': {
    answers: [['for'], ['appreciate'], ['hearing']],
    comments: ['Thank you for + 감사의 대상을 써요.', 'appreciate는 목적어(your help)를 바로 받아요.', 'look forward to 다음에는 동사ing 형태가 와요.'],
  },
  'b-delay': {
    answers: [['apologize', 'apologise'], ['by'], ['understanding']],
    comments: ['apologize for ~ 로 사과의 이유를 연결해요.', 'by the end of the day는 오늘 업무 종료 전까지라는 뜻이에요.', 'Thank you for your understanding은 양해에 감사하는 관용 표현이에요.'],
  },
};

const ruleChecks: Record<string, (body: string, polite: boolean) => { label: string; passed: boolean }[]> = {
  'r-sales-report': (body, polite) => [
    { label: '이번 달 영업 자료와 회의 목적', passed: /this month/.test(body) && /sales/.test(body) && /report|data/.test(body) && /meeting/.test(body) },
    { label: '금요일 오전 10시(KST) 기한', passed: /friday/.test(body) && /10\s*(a\.?m\.?|:00\s*(a\.?m\.?)?)/.test(body) && /kst/.test(body) },
    { label: '정중한 요청과 일정 조율', passed: polite && /let me know|more time|work for you/.test(body) },
  ],
  'r-cancel-meeting': (body, polite) => [
    { label: '회의 취소와 사과', passed: /cancel|postpone|reschedul/.test(body) && /sorry|apolog/.test(body) },
    { label: '다음 주 일정 재조정 제안', passed: /next week/.test(body) },
    { label: '가능한 시간 정중하게 묻기', passed: polite && /available|availability|convenient|let me know|work for you/.test(body) },
  ],
  'w-reschedule': body => [
    { label: '변경 사유와 사과', passed: /internal|scheduling conflict|schedule change/.test(body) && /sorry|apolog/.test(body) },
    { label: '11월 5일 오후 3시(KST) 제안', passed: /november\s+5|nov\.?\s+5|5\s+november/.test(body) && /3\s*(p\.?m\.?|:00\s*p\.?m\.?)|15:00/.test(body) && /kst/.test(body) },
    { label: '가능 여부 회신 요청', passed: /let me know|work for you|confirm|available/.test(body) },
  ],
  'w-welcome': body => [
    { label: '환영 인사', passed: /welcome|excited to have you|glad to have you/.test(body) },
    { label: '첫 출근 일시·장소', passed: /monday|november\s+9|nov\.?\s+9/.test(body) && /9\s*(a\.?m\.?|:00)/.test(body) && /lobby|3rd floor|third floor/.test(body) },
    { label: '준비물(ID) 안내', passed: /\bid\b|identification|id card/.test(body) },
  ],
};

const normalize = (value: string) => value.toLowerCase().replace(/[’']/g, "'").replace(/[.,!?]+$/, '').replace(/\s+/g, ' ').trim();

export function hasAnswerKey(exercise: Exercise) {
  return exercise.stage === 0 ? exercise.id in blankKeys : exercise.id in ruleChecks;
}

export function evaluateDemo(exercise: Exercise, answer: Draft): Evaluation {
  if (exercise.stage === 0) {
    const key = blankKeys[exercise.id];
    const max = key.answers.map((_, i) => i === 0 ? 100 - Math.floor(100 / key.answers.length) * (key.answers.length - 1) : Math.floor(100 / key.answers.length));
    const checks = exercise.requirements.map((label, i) => ({ label, passed: key.answers[i].includes(normalize(answer.blanks[i] || '')) }));
    const scores = checks.map((check, i) => ({ label: check.label, score: check.passed ? max[i] : 0, max: max[i], comment: key.comments[i] }));
    const feedback = checks.flatMap((check, i) => check.passed ? [] : [`${i + 1}번 빈칸 정답은 “${key.answers[i][0]}”. ${key.comments[i]}`]);
    return { total: scores.reduce((n, x) => n + x.score, 0), summary: checks.every(x => x.passed) ? '모든 빈칸을 정확하게 채웠어요!' : '틀린 빈칸의 표현을 확인하고 다음 문제에 도전해 보세요.', scores, feedback, checks, mode: 'demo' };
  }
  const body = answer.body.toLowerCase();
  const polite = /could you|would you|would it|please/.test(body);
  const structured = /^(hi|dear|hello)\b/i.test(answer.body.trim()) && /regards|sincerely|thank/.test(body);
  const checks = ruleChecks[exercise.id](body, polite);
  const english = /[a-z]{2,}/i.test(body);
  const longEnough = body.trim().split(/\s+/).length >= 25;
  const scores = [
    { label: '필수 정보', score: Math.round(checks.filter(x => x.passed).length / checks.length * 40), max: 40, comment: '예시 키워드로 필수 정보를 확인합니다. 의미가 같아도 인식하지 못할 수 있어요.' },
    { label: '문서 구성', score: structured ? 20 : 10, max: 20, comment: structured ? '인사와 마무리 표현이 포함되어 있어요.' : '인사와 마무리 표현을 확인해 보세요.' },
    { label: '정중한 표현', score: polite ? 20 : 5, max: 20, comment: polite ? '정중한 요청 표현을 사용했어요.' : 'Could you please… 같은 표현을 추가해 보세요.' },
    { label: '작성 분량', score: english && longEnough ? 20 : english ? 10 : 0, max: 20, comment: '데모에서는 영어 포함 여부와 25단어 이상인지 확인합니다. 문법 평가는 하지 않습니다.' },
  ];
  return { total: scores.reduce((n, x) => n + x.score, 0), summary: '작성한 이메일을 돌아보세요. 데모 점수는 단순 규칙으로 계산하며 실제 AI 평가가 아닙니다.', scores, feedback: checks.filter(x => !x.passed).map(x => `${x.label}: 내용이 포함되었는지 확인해 주세요.`), checks, mode: 'demo' };
}
