import { CopyButton } from './CopyButton';

export type PillTone = 'warn' | 'ok' | 'neutral' | 'danger';

const PILL_TONES: Record<PillTone, string> = {
  warn: 'text-warn',
  ok: 'text-ok',
  neutral: 'text-muted',
  danger: 'text-danger',
};

const PILL_DOTS: Record<PillTone, string> = {
  warn: 'bg-[#e8a33d] ring-4 ring-[#e8a33d]/20',
  ok: 'bg-[#16a34a] ring-4 ring-[#16a34a]/15',
  neutral: 'bg-faint/60 ring-4 ring-faint/10',
  danger: 'bg-danger ring-4 ring-danger/15',
};

export const Pill = ({ tone, children }: { tone: PillTone; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-2.5 text-sm font-medium ${PILL_TONES[tone]}`}>
    <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${PILL_DOTS[tone]}`} />
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
  <div className={`overflow-hidden rounded-xl ${dark ? 'bg-ink text-white' : 'border border-line bg-white'}`}>
    <div className={`flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-4 ${dark ? 'border-b border-white/10' : 'border-b border-line'}`}>
      <span className={`text-xs font-medium ${dark ? 'text-white/50' : 'text-faint'}`}>{label ?? 'Code'}</span>
      <CopyButton text={code} variant={dark ? 'dark' : 'light'} label="Copy" />
    </div>
    <pre
      tabIndex={0}
      aria-label={label}
      className={`overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap ${dark ? 'text-white/90' : 'text-ink'}`}
    >
      {code}
    </pre>
  </div>
);
