import { CopyButton } from './CopyButton';

export type PillTone = 'warn' | 'ok' | 'neutral' | 'danger';

const PILL_TONES: Record<PillTone, string> = {
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
  neutral: 'bg-surface text-muted',
  danger: 'bg-danger-soft text-danger',
};

const PILL_DOTS: Record<PillTone, string> = {
  warn: 'border-2 border-current bg-transparent',
  ok: 'bg-current',
  neutral: 'bg-current opacity-50',
  danger: 'bg-current',
};

export const Pill = ({ tone, children }: { tone: PillTone; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${PILL_TONES[tone]}`}>
    <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${PILL_DOTS[tone]}`} />
    {children}
  </span>
);

export const Spinner = ({ className = '' }: { className?: string }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-4 w-4 animate-spin ${className}`}>
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const CodeBlock = ({ code, label, dark = false }: { code: string; label?: string; dark?: boolean }) => (
  <div className={`flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-start ${dark ? 'bg-ink text-white' : 'border border-line bg-white'}`}>
    <pre
      tabIndex={0}
      aria-label={label}
      className={`min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-all px-1 py-1.5 font-mono text-sm leading-relaxed ${dark ? 'text-white' : 'text-ink'}`}
    >
      {code}
    </pre>
    <CopyButton text={code} variant={dark ? 'dark' : 'light'} label={label ? `Copy ${label.toLowerCase()}` : 'Copy'} />
  </div>
);
