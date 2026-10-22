'use client';

import { useEffect, useRef, useState } from 'react';
import type { BlankMode, Exercise } from '@/lib/learning';

type Props = {
  exercise: Exercise;
  mode: BlankMode;
  values: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  results?: boolean[];
};

export default function BlankEditor({ exercise, mode, values, onChange, disabled, results }: Props) {
  const blanks = exercise.blanks || [];
  const [open, setOpen] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const openIndex = disabled ? null : open;

  useEffect(() => {
    if (openIndex === null) return;
    const onPointer = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(null); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [openIndex]);

  function set(index: number, value: string) {
    const next = values.map((v, i) => i === index ? value : v);
    onChange(next);
    return next;
  }
  function choose(index: number, value: string) {
    const next = set(index, value);
    const nextEmpty = next.findIndex((v, i) => i > index && !v);
    setOpen(nextEmpty === -1 ? null : nextEmpty);
  }
  const state = (i: number) => results ? (results[i] ? 'correct' : 'wrong') : values[i] ? 'filled' : '';

  return <div className="blank-editor" ref={rootRef}>
    {blanks.map((blank, i) => <span key={blank.label}>
      {blank.before}
      <span className="blank-slot">
        {mode === 'choice' ? <>
          <button type="button" className={`blank-chip ${state(i)} ${openIndex === i ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={openIndex === i} aria-label={`빈칸 ${i + 1}: ${blank.label}${values[i] ? `, 선택: ${values[i]}` : ''}`} disabled={disabled} onClick={() => setOpen(openIndex === i ? null : i)}>
            <span className="blank-number">{i + 1}</span>{values[i] || <span className="blank-placeholder">{blank.label}</span>}
          </button>
          {openIndex === i && <span className="blank-popover" role="listbox" aria-label={`${blank.label} 보기`}>
            <span className="popover-label">{blank.label}</span>
            <span className="popover-options">{blank.options.map(option => <button type="button" role="option" aria-selected={values[i] === option} key={option} className="option-chip" onClick={() => choose(i, option)}>{option}</button>)}</span>
          </span>}
        </> : <span className={`blank-input-wrap ${state(i)}`}>
          <span className="blank-number">{i + 1}</span>
          <input className="blank-input" aria-label={`빈칸 ${i + 1}: ${blank.label}`} value={values[i]} placeholder={blank.label} maxLength={40} disabled={disabled} autoComplete="off" autoCapitalize="off" spellCheck={false} style={{ width: `${Math.max(...blank.options.map(o => o.length), blank.label.length * 2, 6) + 2}ch` }} onChange={e => set(i, e.target.value)} />
        </span>}
      </span>
      {blank.after}
    </span>)}
  </div>;
}
