'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { blankBody, blanks, emptyDraft, exercises, isStage, stageNames, type Draft, type Evaluation, type Stage, type Submission } from '@/lib/learning';

type Screen = 'welcome' | 'login' | 'kits' | 'learn' | 'history';
const stages: Stage[] = [0, 1, 2];
const storeKey = 'rootkit-demo-v1';
type Store = { name: string; drafts: Partial<Record<Stage, Draft>>; history: Submission[] };
const freshStore = (): Store => ({ name: '', drafts: {}, history: [] });
function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Draft;
  return typeof d.subject === 'string' && typeof d.body === 'string' && Array.isArray(d.blanks) && d.blanks.length === 3 && d.blanks.every(x => typeof x === 'string');
}
function readStore(): Store {
  try {
    const value = JSON.parse(localStorage.getItem(storeKey) || 'null');
    if (!value || typeof value !== 'object') return freshStore();
    const drafts: Store['drafts'] = {};
    for (const stage of stages) if (isDraft(value.drafts?.[stage])) drafts[stage] = value.drafts[stage];
    const history = Array.isArray(value.history) ? value.history.filter((x: Submission) => x && typeof x.id === 'string' && isStage(x.stage) && isDraft(x.draft) && typeof x.createdAt === 'string' && x.evaluation && typeof x.evaluation.total === 'number' && Array.isArray(x.evaluation.scores) && Array.isArray(x.evaluation.checks) && Array.isArray(x.evaluation.feedback)) : [];
    return { name: typeof value.name === 'string' ? value.name : '', drafts, history: history.slice(0, 100) };
  } catch { return freshStore(); }
}
function Brand() { return <Link className="brand" href="/" aria-label="rootkit 홈"><span className="brand-mark">r</span>rootkit<span className="brand-dot">.</span></Link>; }
function Arrow() { return <span aria-hidden="true">↗</span>; }

export default function Rootkit({ screen, stage = 0 }: { screen: Screen; stage?: Stage }) {
  const router = useRouter();
  const [store, setStore] = useState<Store>(freshStore);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(stage));
  const [name, setName] = useState('');
  const [hint, setHint] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [storageOk, setStorageOk] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const task = exercises[stage];

  useEffect(() => {
    const saved = readStore();
    setStore(saved);
    setDraft(saved.drafts[stage] || emptyDraft(stage));
    setReady(true);
  }, [stage]);
  useEffect(() => { if (evaluation) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [evaluation]);
  function persist(next: Store) {
    setStore(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); setStorageOk(true); return true; }
    catch { setStorageOk(false); return false; }
  }
  function edit(next: Draft) {
    setDraft(next); setEvaluation(null); setNotice('');
    persist({ ...store, drafts: { ...store.drafts, [stage]: next } });
  }
  function login(event: FormEvent) {
    event.preventDefault();
    persist({ ...store, name: name.trim() || '루키' });
    router.push('/kits');
  }
  function logout() {
    persist({ ...store, name: '' }); router.push('/login');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true); setNotice(''); setEvaluation(null);
    try {
      const response = await fetch('/api/demo/evaluations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage, answer: draft }), signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '채점 요청에 실패했습니다.');
      const result = data as Evaluation;
      const item: Submission = { id: crypto.randomUUID(), stage, draft: { ...draft }, evaluation: result, createdAt: new Date().toISOString() };
      persist({ ...store, drafts: { ...store.drafts, [stage]: draft }, history: [item, ...store.history].slice(0, 100) });
      setEvaluation(result);
    } catch (error) {
      setNotice(error instanceof Error && error.name === 'TimeoutError' ? '응답 시간이 초과되었습니다. 작성 내용은 유지됩니다. 다시 제출해 주세요.' : error instanceof Error ? error.message : '연결을 확인하고 다시 제출해 주세요.');
    } finally { submitting.current = false; setPending(false); }
  }
  const completed = stages.filter(s => store.history.some(h => h.stage === s));
  const words = (stage === 0 ? blankBody(draft.blanks) : draft.body).trim().split(/\s+/).filter(Boolean).length;
  const workspace = ['kits', 'learn', 'history'].includes(screen);

  return <div className={`app ${workspace ? 'workspace' : ''}`}>
    <header className="site-header">
      <div className="header-start"><Brand />{workspace && <nav className="main-nav" aria-label="주 메뉴"><Link className={screen !== 'history' ? 'active' : ''} href="/kits">학습 키트</Link><Link className={screen === 'history' ? 'active' : ''} href="/history">나의 학습 기록</Link></nav>}</div>
      <div className="header-end">{workspace ? <><span className="badge header-badge">🌱 신입사원 과정</span><span className="avatar">{(store.name || 'R').slice(0, 1)}</span><span className="user-name">{store.name || '루키'}님</span><button className="text-button" onClick={logout}>나가기</button></> : <><span className="tagline">Rookie + Kit</span>{screen === 'login' ? <Link className="text-button" href="/">← 처음으로</Link> : <Link className="badge" href="/login">신입의 첫 시작을 함께 <Arrow /></Link>}</>}</div>
    </header>

    {screen === 'welcome' && <>
      <main className="hero"><div className="hero-copy"><span className="eyebrow">YOUR FIRST STEP AT WORK</span><h1>첫 업무 메일도,<br /><em>자신 있게 보내도록.</em></h1><p>우리 회사의 언어를 배우는 가장 좋은 시작.<br />실제 업무 문서로 연습하며, 나만의 비즈니스 영어를 완성하세요.</p><Link className="button primary hero-cta" href="/login">나의 첫 연습 시작하기 <Arrow /></Link><span className="fine-print">신입사원을 위한 실무 학습 키트, rootkit</span></div><div className="hero-art" aria-label="기본 영어 표현을 비즈니스 표현으로 개선한 예시"><span className="spark">✳</span><div className="floating-mail"><div className="mail-top"><span className="mail-icon">✉</span><span className="badge">A little more professional</span></div><div className="skeleton-line short" /><div className="skeleton-line" /><p className="before-line">Send me the report by Friday.</p><div className="after-line">Could you please share the report<br />by Friday?<small>명확한 요청에 정중함을 더해보세요.</small></div></div><span className="floating-note"><b>✓</b> 작은 연습이, 실무의 자신감으로.</span></div></main>
      <section className="intro-steps" aria-label="학습 과정">{stages.map(s => <article key={s}><span className="step-number">0{s} /</span><div><h2>{stageNames[s]}</h2><p>{['빈칸을 채우며 실무에서 쓰는\n핵심 표현부터 익혀요.', '기본 이메일을 다듬으며\n정중한 문장을 연습해요.', '업무 상황을 읽고\n나만의 이메일을 완성해요.'][s]}</p></div></article>)}</section><footer className="landing-footer"><span>우리 회사 문서로 배우는 첫 실무</span><span>ROOKIE TODAY. READY TOMORROW.</span></footer>
    </>}

    {screen === 'login' && <main className="login-layout"><section className="login-story"><span className="eyebrow">WELCOME TO YOUR NEXT CHAPTER</span><h1>처음이라 낯선 업무,<br />연습하면 익숙해집니다.</h1><p>하나의 메일, 하나의 표현부터.<br />rootkit과 함께 첫 업무를 준비해 보세요.</p><div className="login-quote"><span>“Could you please…?”</span><p>작은 표현의 차이가 만드는,<br />더 좋은 커뮤니케이션.</p><small>BUSINESS ENGLISH · ROOTKIT</small></div></section><section className="login-form-wrap"><form onSubmit={login} className="login-form"><span className="badge">나의 온보딩 워크스페이스</span><h2>반가워요, 루키님 <span>👋</span></h2><p>오늘의 작은 연습을 시작해 볼까요?</p><label htmlFor="name">어떻게 불러드릴까요?</label><input id="name" value={name} maxLength={20} onChange={e => setName(e.target.value)} placeholder="루키" autoComplete="nickname" /><button className="button primary" disabled={!ready}>데모로 시작하기 <span>→</span></button><div className="info-note">실제 계정 없이 체험하는 데모입니다.<br />비밀번호를 입력할 필요가 없어요. 작성 내용과 학습 기록은 이 브라우저에 저장됩니다.</div></form></section></main>}

    {screen === 'kits' && <main className="dashboard content-width"><div className="breadcrumb">워크스페이스 &nbsp; / &nbsp; 온보딩 학습 키트</div><div className="dashboard-heading"><div><span className="eyebrow">YOUR LEARNING JOURNEY</span><h1>{store.name || '루키'}님, 오늘도 한 걸음 더.</h1><p>빈칸 채우기부터 직접 작성까지. 나의 속도로 차근차근 연습하세요.</p></div><span className="badge">BUSINESS ENGLISH</span></div><section className="progress-banner"><div><span className="progress-icon">↗</span><div><h2>비즈니스 이메일 첫걸음</h2><p>동료에게 자료를 요청하고, 고객에게 일정을 안내하는 법을 배워요.</p></div></div><div className="progress-summary"><span><b>{completed.length}</b> / 3 단계 제출</span><progress max={3} value={completed.length} aria-label="학습 진행률" /></div></section><div className="section-heading"><h2>나의 학습 키트 <span>03</span></h2><small>순서대로, 또는 원하는 단계부터 시작하세요.</small></div><section className="kit-grid">{stages.map(s => {
      const done = completed.includes(s); const taskDraft = store.drafts[s]; const started = taskDraft && (taskDraft.body || taskDraft.blanks.some(Boolean));
      return <article className="kit-card" key={s}><div className={`kit-art art-${s}`} aria-hidden="true">{s === 0 ? <div className="art-paper"><span>Could you <i>please</i></span><span>share the report?</span><b>✧</b></div> : s === 1 ? <div className="art-paper"><del>Send me the report.</del><span className="art-highlight">Could you please…?</span><b>✎</b></div> : <div className="art-paper"><span>To: Jamie Lee</span><span>Subject: <i>My first email</i></span><b>↗</b></div>}</div><div className="kit-card-content"><div className="card-meta"><span>STEP 0{s} · {['입문', '기초', '실전'][s]}</span><span>{done ? '✓ 제출 완료' : started ? '이어서 학습' : '시작 전'}</span></div><h3>{stageNames[s]}</h3><p>{exercises[s].subtitle}</p><div className="kit-info"><span>✉ 이메일</span><span>◷ {exercises[s].time}</span></div><Link className={`button ${s === 0 ? 'primary' : 'secondary'}`} href={`/learn/${s}`}>{done ? '다시 연습하기' : started ? '이어서 연습하기' : '연습 시작하기'} <span>→</span></Link></div></article>;
    })}</section><div className="learning-tip"><span>✧</span><div><strong>완벽한 문장보다, 직접 써보는 경험이 먼저예요.</strong><p>작성한 이메일은 피드백을 확인하고 언제든 수정해 다시 제출할 수 있어요.</p></div><Link href="/history">학습 기록 보기 →</Link></div><DemoNote /></main>}

    {screen === 'learn' && <main className="learning content-width"><div className="breadcrumb"><Link href="/kits">워크스페이스</Link> &nbsp; / &nbsp; 비즈니스 영어 &nbsp; / &nbsp; {stageNames[stage]}</div><div className="learning-heading"><div><h1>작은 연습, 더 나은 커뮤니케이션</h1><p>실무에서 만나는 상황을 연습하고, 우리 회사의 표현을 익혀보세요.</p></div><Link className="back-link" href="/kits">키트 목록 ↗</Link></div><nav className="stage-tabs" aria-label="학습 단계">{stages.map(s => <Link href={`/learn/${s}`} aria-current={s === stage ? 'step' : undefined} className={s === stage ? 'selected' : ''} key={s}><span className="stage-circle">{s === stage ? `0${s}` : completed.includes(s) ? '✓' : `0${s}`}</span><span>{stageNames[s]}</span><small>{['표현 익히기', '기본 메일 수정', '직접 작성'][s]}</small></Link>)}</nav>
      <div className="exercise-grid"><section className="task-pane"><div className="pane-heading"><span>☷ &nbsp; 학습 과제</span><small>PRACTICE 0{stage} / 02</small></div><div className="task-content"><div className="task-tags"><span>STEP {stage} · {['입문', '기초', '실전'][stage]}</span><span>{stage === 2 ? '일정 변경' : '업무 요청'}</span><span>{task.time}</span></div><h2>{task.title}</h2><p className="task-description">{task.description}</p><div className="scenario"><span className="eyebrow">{stage === 2 ? 'YOUR MISSION' : 'BACKGROUND'}</span><p>{task.scenario}</p></div>{stage === 0 && <div className="original-email"><div className="document-label">EMAIL PREVIEW · 완성할 이메일</div><div className="document-content"><strong>Subject: {task.subject}</strong><p>{blankBody(['[ ① ]', '[ ② ]', '[ ③ ]'])}</p></div></div>}{stage === 1 && <div className="original-email"><div className="document-label">ORIGINAL EMAIL · 기본 영어 메일</div><div className="document-content"><strong>Subject: {task.subject}</strong><p>{task.original}</p></div></div>}<h3>이번 연습에서 꼭 확인해 주세요</h3><ul className="requirements">{task.requirements.map(x => <li key={x}><span>✓</span>{x}</li>)}</ul><details className="reference"><summary>▤ &nbsp; 참고할 사내 문서 <small>예시 자료 · 1건</small></summary><p>{task.reference}</p><small>학습용 가상 자료입니다. 실제 사내 문서를 검색한 결과가 아닙니다.</small></details></div></section>
      <section className="writing-pane"><div className="pane-heading"><span>✎ &nbsp; {stage === 0 ? '표현을 채워 완성하기' : '나의 이메일'}</span><small>{stage === 0 ? 'FILL IN THE BLANKS' : 'ENGLISH WRITING'}</small></div><form onSubmit={submit}><fieldset disabled={pending || !ready}><div className="editor"><div className="recipient"><span>To</span><b>{task.recipient}</b></div><div className="subject-row"><label htmlFor="subject">Subject</label><input id="subject" value={draft.subject} onChange={e => edit({ ...draft, subject: e.target.value })} readOnly={stage === 0} required maxLength={200} placeholder="메일의 목적이 드러나는 제목을 작성해 주세요" /></div>{stage === 0 ? <div className="blank-editor">{blanks.map((b, i) => <span key={b.label}>{b.before}<span className="inline-blank"><span className="blank-number">{i + 1}</span><select aria-label={`빈칸 ${i + 1}: ${b.label}`} value={draft.blanks[i]} required onChange={e => edit({ ...draft, blanks: draft.blanks.map((value, idx) => idx === i ? e.target.value : value) })}><option value="">표현 선택</option>{b.options.map(x => <option key={x} value={x}>{x}</option>)}</select></span>{b.after}</span>)}</div> : <textarea aria-label="이메일 본문" required maxLength={10000} value={draft.body} onChange={e => edit({ ...draft, body: e.target.value })} placeholder={`${stage === 1 ? 'Hi Alex,' : 'Dear Jamie,'}\n\n첫 문장을 적어보세요. 완벽하지 않아도 괜찮아요.\n\nBest regards,\n${store.name || 'Rookie'}`} />}<div className="editor-status"><span>{storageOk ? '✓ 이 브라우저에 자동 저장' : '브라우저 저장 불가 · 현재 화면에서만 유지'}</span><span>{stage === 0 ? `${draft.blanks.filter(Boolean).length} / 3 선택` : `${words} words`}</span></div></div><div className="editor-actions"><button type="button" className="button secondary hint-toggle" aria-expanded={hint} onClick={() => setHint(!hint)}>✧ &nbsp; 표현 힌트</button><button className="button primary">{pending ? '답안을 확인하고 있어요…' : stage === 0 ? '정답 확인하기 →' : '제출하고 피드백 보기 →'}</button></div></fieldset></form>{hint && <div className="hint-box"><strong>이렇게 시작해 보세요</strong><p>{task.hint}</p></div>}{notice && <div className="error-note" role="alert">{notice}</div>}{!evaluation && <div className="editor-bottom-note">{stage === 0 ? '문맥에 맞는 표현을 선택하면 이메일이 완성돼요.' : '작성한 메일은 실제 발송되지 않아요. 안심하고 연습하세요.'}</div>}{evaluation && <div ref={resultRef} className="feedback-panel" role="status"><div className="feedback-heading"><div><span className="eyebrow">YOUR FEEDBACK</span><h3>{evaluation.total === 100 ? '잘했어요, 루키님!' : '한 번 더 다듬어 볼까요?'}</h3></div><div className="score-number">{evaluation.total}<small>/ 100</small></div></div><p>{evaluation.summary}</p><div className="score-grid">{evaluation.scores.map(s => <div key={s.label}><span>{s.label}</span><b>{s.score}<small> / {s.max}</small></b><progress max={s.max} value={s.score} aria-label={s.label} /><p>{s.comment}</p></div>)}</div><ul className="feedback-checks">{evaluation.checks.map(c => <li key={c.label} className={c.passed ? 'passed' : ''}><span>{c.passed ? '✓' : '○'}</span>{c.label}</li>)}</ul>{evaluation.feedback.map(x => <p className="feedback-tip" key={x}>{x}</p>)}<div className="result-actions"><button className="button secondary" onClick={() => { setEvaluation(null); document.getElementById('subject')?.focus(); }}>수정해서 다시 제출</button><Link className="button primary" href={stage < 2 ? `/learn/${stage + 1}` : '/history'}>{stage < 2 ? '다음 단계로 →' : '학습 기록 보기 →'}</Link></div><small className="demo-disclaimer">데모 규칙으로 계산한 점수입니다. 실제 AI 채점은 연결되지 않았습니다.</small></div>}</section></div><DemoNote /></main>}

    {screen === 'history' && <main className="history content-width"><div className="breadcrumb"><Link href="/kits">워크스페이스</Link> &nbsp; / &nbsp; 나의 학습 기록</div><div className="dashboard-heading"><div><span className="eyebrow">EVERY SMALL STEP COUNTS</span><h1>차곡차곡 쌓이는 나의 연습</h1><p>작성한 답안과 피드백을 돌아보며, 다음 문장을 더 자신 있게.</p></div><Link href="/kits" className="button primary">연습하러 가기 →</Link></div><div className="history-stats"><div><span>제출한 답안</span><b>{store.history.length}<small>개</small></b></div><div><span>연습한 단계</span><b>{completed.length}<small> / 3</small></b></div><div><span>최근 데모 점수</span><b>{store.history[0]?.evaluation.total ?? '—'}<small> / 100</small></b></div></div>{!ready ? <p className="empty-state">학습 기록을 불러오고 있어요.</p> : store.history.length === 0 ? <div className="empty-state"><span>✉</span><h2>아직 첫 문장을 기다리고 있어요.</h2><p>빈칸 채우기부터 가볍게 시작해 보세요.</p><Link className="button primary" href="/learn/0">첫 연습 시작하기 →</Link></div> : <div className="history-list">{store.history.map(item => <details className="history-item" key={item.id}><summary><span className="history-step">0{item.stage}</span><div><strong>{stageNames[item.stage]}</strong><span>{new Date(item.createdAt).toLocaleString('ko-KR')} · {item.draft.subject}</span></div><b>{item.evaluation.total}<small>점</small></b><span aria-hidden="true">⌄</span></summary><div className="history-detail"><div><h3>제출한 이메일</h3><strong>{item.draft.subject}</strong><p>{item.stage === 0 ? blankBody(item.draft.blanks) : item.draft.body}</p></div><div><h3>데모 피드백</h3><p>{item.evaluation.summary}</p>{item.evaluation.checks.map(c => <p key={c.label}>{c.passed ? '✓' : '○'} {c.label}</p>)}{item.evaluation.feedback.map(f => <p key={f}>{f}</p>)}<Link href={`/learn/${item.stage}`} className="button secondary">이 단계 다시 연습 →</Link></div></div></details>)}</div>}<DemoNote /></main>}
    {!storageOk && <div className="storage-warning" role="status">브라우저 저장을 사용할 수 없어 새로고침하면 기록이 사라질 수 있어요.</div>}
  </div>;
}
function DemoNote() { return <footer className="demo-note"><span>ⓘ 데모 모드 · 가상 문제와 규칙 기반 피드백 · 기록은 현재 브라우저에 저장됩니다.</span><span>ROOKIE TODAY. READY TOMORROW.</span></footer>; }
