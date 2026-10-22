export type Stage = 0 | 1 | 2;
export type Draft = { subject: string; body: string; blanks: string[] };
export type Score = { label: string; score: number; max: number; comment: string };
export type Evaluation = { total: number; summary: string; scores: Score[]; feedback: string[]; checks: { label: string; passed: boolean }[]; mode: 'demo' };
export type Submission = { id: string; stage: Stage; draft: Draft; evaluation: Evaluation; createdAt: string };
export type Exercise = { title: string; subtitle: string; description: string; time: string; recipient: string; scenario: string; subject: string; original: string | null; requirements: string[]; hint: string; reference: string };
export const stageNames = ['빈칸 채우기', '이메일 다듬기', '상황별 작성'] as const;
export const exercises: Record<Stage, Exercise> = {
  0: { title: '정중한 요청, 한 문장부터', subtitle: '핵심 표현을 익히는 작은 시작', description: '문맥에 맞는 표현을 골라 이메일의 빈칸을 완성해 보세요.', time: '약 5분', recipient: 'Alex Morgan · Sales Team', scenario: '금요일 회의를 준비하기 위해 영업팀 Alex에게 이번 달 영업 실적 자료를 요청하려고 합니다. 금요일 오전 10시(KST)까지 자료를 받을 수 있도록 정중하게 요청하세요.', subject: "Request for this month's sales report", original: null, requirements: ['정중하게 자료 요청하기', '요청 기한 연결하기', '일정 조율 가능 여부 전하기'], hint: 'Could you please + 동사원형은 정중한 요청에 쓰여요. 마감 시점 앞에는 by를 사용해요.', reference: '요청 메일에는 필요한 자료, 사용 목적, 기한을 명확히 적고 상대방의 일정도 배려합니다.' },
  1: { title: '조금 더 정중하게, 자료 요청하기', subtitle: '일상 표현을 비즈니스 표현으로', description: '왼쪽의 기본 이메일을 동료에게 보내기 적절한 비즈니스 이메일로 다듬어 보세요.', time: '약 10분', recipient: 'Alex Morgan · Sales Team', scenario: '금요일 회의 준비를 위해 이번 달 영업 실적 자료가 필요합니다. 영업팀 Alex에게 금요일 오전 10시(KST)까지 자료를 요청해 주세요.', subject: 'Send me the sales report', original: "Hi Alex,\n\nI need this month's sales report for our Friday meeting.\nSend it to me by Friday at 10 a.m. KST.\nTell me if you can't.\n\nThanks,\nRookie", requirements: ['이번 달 영업 실적 자료와 회의 준비 목적 전달', '금요일 오전 10시(KST) 마감 안내', '정중한 요청과 일정 조율 문구 포함'], hint: 'Could you please share…? / Please let me know if you need more time.', reference: '자료 요청 시 요청 목적과 마감 시점을 함께 전달합니다. 상대방이 일정을 조율할 수 있도록 회신 문장을 덧붙입니다.' },
  2: { title: '변경된 일정을 고객에게 안내하기', subtitle: '업무 상황을 한 통의 메일로', description: '이번에는 기본 이메일이 없어요. 업무 상황을 읽고 고객에게 보낼 이메일을 직접 작성해 보세요.', time: '약 15분', recipient: 'Jamie Lee · Client', scenario: '당신은 프로젝트 운영팀의 신입사원입니다. 내부 일정 변경으로 고객사 Jamie와의 신규 서비스 도입 미팅을 옮겨야 합니다.\n\n기존 일정: 2026년 11월 4일 수요일 오후 2시 (KST)\n제안 일정: 2026년 11월 5일 목요일 오후 3시 (KST)\n미팅 내용: 신규 서비스 도입 일정 논의', subject: '', original: null, requirements: ['일정 변경 사유와 사과 전달', '새로운 날짜·시간·시간대 제시', '제안한 일정이 가능한지 회신 요청'], hint: 'Would it be possible to reschedule…? / I apologize for any inconvenience. / Would this time work for you?', reference: '일정을 바꿀 때에는 변경 사유를 간결하게 설명하고, 대체 일정과 시간대를 제시한 뒤 상대방의 가능 여부를 확인합니다.' },
};
export const blanks = [
  { label: '정중한 요청', before: 'Hi Alex,\n\n', after: " share this month's sales report", options: ['You must', 'Could you please', 'Why not'] },
  { label: '마감 시점', before: ' ', after: ' Friday at 10 a.m. KST?\nI need it to prepare for our Friday meeting.\n\n', options: ['since', 'during', 'by'] },
  { label: '일정 조율', before: '', after: ' if you need more time.\n\nBest regards,\nRookie', options: ['Please let me know', "Don't tell me", 'You should finish'] },
];
export function emptyDraft(stage: Stage): Draft { return { subject: stage === 0 ? exercises[0].subject : '', body: '', blanks: ['', '', ''] }; }
export function blankBody(values: string[]) { return blanks.map((blank, i) => blank.before + (values[i] || `[빈칸 ${i + 1}]`) + blank.after).join(''); }
export function isStage(value: unknown): value is Stage { return value === 0 || value === 1 || value === 2; }
