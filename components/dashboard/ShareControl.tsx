'use client';

import { useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { pickString } from '@/lib/pick';
import { safeHttpUrl } from '@/lib/shared';
import { buttonSecondary } from '@/lib/styles';
import { CopyButton } from '../CopyButton';
import { Spinner } from '../ui';
import { useDashboard } from './context';

export const shareUrlOf = (data: unknown): string => {
  const url = safeHttpUrl(pickString(data, ['share_url', 'share.share_url', 'share.url']));
  if (url) return url;
  const token = pickString(data, ['token', 'share.token', 'share_token']);
  return token && typeof window !== 'undefined' ? `${window.location.origin}/r/${encodeURIComponent(token)}` : '';
};

export const ShareControl = ({ resultId, initialUrl }: { resultId: string; initialUrl: string }) => {
  const { apiKey } = useDashboard();
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = `/sfa/results/${encodeURIComponent(resultId)}/share`;

  const share = async () => {
    setBusy(true);
    setError(null);
    const { envelope } = await api(path, { method: 'POST', key: apiKey, body: {} });
    const next = envelope.ok ? shareUrlOf(dataOf(envelope)) : '';
    setBusy(false);
    if (next) setUrl(next);
    else setError(envelope.ok ? 'The share link did not come back. Try again.' : errorMessage(envelope));
  };

  const unshare = async () => {
    setBusy(true);
    setError(null);
    const { envelope } = await api(path, { method: 'DELETE', key: apiKey });
    setBusy(false);
    if (envelope.ok) setUrl('');
    else setError(errorMessage(envelope));
  };

  return (
    <section aria-label="Share this result" className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{url ? 'Shared' : 'Share this result'}</h3>
        <p className="text-sm text-muted">
          {url ? 'Anyone with this link can open the page.' : 'Creates a public page with the result. It never shows your key or your balance.'}
        </p>
      </div>
      {url ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code data-testid="share-url" className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2.5 font-mono text-xs">
              {url}
            </code>
            <CopyButton text={url} label="Copy link" />
          </div>
          <div className="flex flex-wrap items-center gap-x-5">
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-2">
              Open page
            </a>
            <button type="button" onClick={unshare} disabled={busy} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-danger underline underline-offset-2 disabled:opacity-60">
              {busy ? <Spinner /> : null}
              Stop sharing
            </button>
          </div>
        </>
      ) : (
        <div>
          <button type="button" onClick={share} disabled={busy} className={buttonSecondary}>
            {busy ? <Spinner /> : null}
            Create share link
          </button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
};
