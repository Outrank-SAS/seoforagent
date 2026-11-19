'use client';

import { useEffect, useRef } from 'react';
import { errorMessage, type Envelope } from '@/lib/api';
import { buttonSecondary } from '@/lib/styles';
import { CopyButton } from '../CopyButton';

export const Card = ({ title, action, children, className = '' }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <section className={`flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 ${className}`}>
    {title || action ? (
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title ? <h2 className="text-lg font-semibold">{title}</h2> : <span />}
        {action}
      </div>
    ) : null}
    {children}
  </section>
);

export const Stat = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) => (
  <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-5">
    <span className="text-sm text-muted">{label}</span>
    <span className="font-mono text-2xl font-semibold">{value}</span>
    {hint ? <span className="text-sm text-muted">{hint}</span> : null}
  </div>
);

export const SkeletonRows = ({ rows = 4 }: { rows?: number }) => (
  <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, index) => (
      <div key={index} className="h-10 animate-pulse rounded-lg bg-surface" />
    ))}
  </div>
);

export const ErrorState = ({ envelope, onRetry, what }: { envelope: Envelope | null; onRetry?: () => void; what: string }) => (
  <div role="alert" className="flex flex-col gap-3 rounded-xl bg-danger-soft p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between">
    <p>
      We could not load {what}. {envelope ? errorMessage(envelope) : ''}
    </p>
    {onRetry ? (
      <button type="button" onClick={onRetry} className={`${buttonSecondary} text-ink`}>
        Retry
      </button>
    ) : null}
  </div>
);

export const EmptyState = ({ title, prompt }: { title: string; prompt?: string }) => (
  <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line p-5">
    <p className="font-medium">{title}</p>
    {prompt ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <p className="flex-1 text-sm text-muted">
          Ask your agent: <span className="font-mono text-ink">{prompt}</span>
        </p>
        <CopyButton text={prompt} label="Copy prompt" />
      </div>
    ) : null}
  </div>
);

export const Notice = ({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger'; children: React.ReactNode }) => {
  const styles = { neutral: 'bg-surface text-ink', ok: 'bg-ok-soft text-ok', warn: 'bg-warn-soft text-warn', danger: 'bg-danger-soft text-danger' }[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${styles}`}>
      {children}
    </div>
  );
};

export const Modal = ({
  open,
  title,
  onClose,
  children,
  side = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: boolean;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
      className={
        side
          ? 'm-0 ml-auto h-dvh max-h-dvh w-full max-w-2xl bg-white p-0 backdrop:bg-ink/40'
          : 'm-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-white p-0 backdrop:bg-ink/40'
      }
    >
      {open ? (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button type="button" onClick={onClose} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-surface" aria-label="Close">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
};

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const toCsv = (rows: Record<string, unknown>[]): string => {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (text: string) => (/[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  return [columns.join(','), ...rows.map((row) => columns.map((column) => escape(cellText(row[column]))).join(','))].join('\n');
};

export const downloadCsv = (rows: Record<string, unknown>[], name: string) => {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export const RowsTable = ({ rows, caption, max = 200 }: { rows: Record<string, unknown>[]; caption: string; max?: number }) => {
  if (rows.length === 0) return <p className="text-sm text-muted">No rows.</p>;
  const columns = [...new Set(rows.slice(0, 50).flatMap((row) => Object.keys(row)))].slice(0, 8);
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="p-2 font-mono text-xs font-semibold whitespace-nowrap">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, max).map((row, index) => (
            <tr key={index} className="border-t border-line">
              {columns.map((column) => (
                <td key={column} className="max-w-xs truncate p-2 align-top" title={cellText(row[column])}>
                  {cellText(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const relativeTime = (value: unknown): { label: string; exact: string } => {
  if (typeof value !== 'string' && typeof value !== 'number') return { label: '', exact: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { label: String(value), exact: String(value) };
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const exact = date.toLocaleString('en-US');
  if (seconds < 60) return { label: 'just now', exact };
  if (seconds < 3600) return { label: `${Math.floor(seconds / 60)} min ago`, exact };
  if (seconds < 86400) return { label: `${Math.floor(seconds / 3600)} h ago`, exact };
  if (seconds < 86400 * 30) return { label: `${Math.floor(seconds / 86400)} d ago`, exact };
  return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), exact };
};

export const shortDate = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
