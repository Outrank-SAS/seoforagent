'use client';

import { useEffect, useRef, useState } from 'react';

const CopyIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </svg>
);

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
};

export const CopyButton = ({
  text,
  label = 'Copy',
  variant = 'light',
  className = '',
  disabled = false,
}: {
  text: string;
  label?: string;
  variant?: 'light' | 'dark';
  className?: string;
  disabled?: boolean;
}) => {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const onClick = async () => {
    const ok = await copyText(text);
    setState(ok ? 'copied' : 'failed');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  };
  const styles =
    variant === 'dark'
      ? 'border border-white/15 bg-white/10 text-white hover:bg-white/20'
      : 'border border-line bg-white text-ink hover:bg-surface';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition-colors disabled:opacity-60 ${styles} ${className}`}
    >
      <CopyIcon />
      <span>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Select and copy' : label}</span>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Copied to the clipboard' : ''}
      </span>
    </button>
  );
};
