'use client';

import { useEffect, useRef, useState } from 'react';
import { blankModeNames, countOptions, estimateMinutes, stageMeta, stageNames, type BlankMode, type SessionConfig, type Stage } from '@/lib/learning';

const blankModeDescriptions: Record<BlankMode, string> = {
  choice: '빈칸을 누르고 보기에서 알맞은 표현을 골라요.',
  input: '보기 없이 알맞은 표현을 직접 입력해요.',
};

export default function StartModal({ stage, onClose, onStart }: { stage: Stage; onClose: () => void; onStart: (config: SessionConfig) => void }) {
  const [config, setConfig] = useState<SessionConfig>({ count: 5, blankMode: 'choice' });
  const dialogRef = useRef<HTMLDivElement>(null);
  const minutes = estimateMinutes(stage, config);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; previous?.focus(); };
  }, []);

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="start-title" ref={dialogRef}>
      <div className="modal-head">
        <div><span className="eyebrow">STEP 0{stage} · {stageMeta[stage].level}</span><h2 id="start-title">{stageNames[stage]}</h2><p>{stageMeta[stage].subtitle}</p></div>
        <button type="button" className="modal-close" aria-label="닫기" onClick={onClose}>✕</button>
      </div>

      {stage === 0 && <fieldset className="modal-section"><legend>문제 유형</legend><div className="option-grid two">{(['choice', 'input'] as const).map(mode => <button type="button" key={mode} className="option-card" aria-pressed={config.blankMode === mode} onClick={() => setConfig({ ...config, blankMode: mode })}><span className="option-icon" aria-hidden="true">{mode === 'choice' ? '☰' : '⌨'}</span><strong>{blankModeNames[mode]}</strong><small>{blankModeDescriptions[mode]}</small></button>)}</div></fieldset>}

      <fieldset className="modal-section"><legend>문제 수</legend><div className="option-grid four">{countOptions.map(count => <button type="button" key={count} className="option-card compact" aria-pressed={config.count === count} onClick={() => setConfig({ ...config, count })}>{count === 'infinite' ? <><strong>∞</strong><small>무한 모드</small></> : <><strong>{count}</strong><small>문제</small></>}</button>)}</div></fieldset>

      <div className="modal-summary">
        <span className="summary-icon" aria-hidden="true">◷</span>
        {minutes === null ? <p><strong>원할 때까지 계속</strong> 문제를 풀 수 있어요. 언제든 그만할 수 있어요.</p> : <p>예상 소요 시간 <strong>약 {minutes}분</strong> · {config.count}문제</p>}
      </div>

      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>취소</button>
        <button type="button" className="button primary" onClick={() => onStart(config)}>시작하기 <span>→</span></button>
      </div>
    </div>
  </div>;
}
