'use client';

import Link from 'next/link';
import { useState } from 'react';
import { hasSubscription, nextPlan, type AccountSummary } from '@/lib/account';
import { api, dataOf, errorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pickString } from '@/lib/pick';
import { buttonPrimary, buttonSecondary } from '@/lib/styles';
import { useDashboard } from './context';

export const useAccountLink = () => {
  const { apiKey } = useDashboard();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = async (intent: 'upgrade' | 'top_up' | 'manage', extra: Record<string, unknown> = {}) => {
    setBusy(intent);
    setError(null);
    const { envelope } = await api('/sfa/account/link', {
      method: 'POST',
      key: apiKey,
      body: { intent, return_origin: window.location.origin, ...extra },
    });
    const url = pickString(dataOf(envelope), ['url', 'link', 'checkout_url']);
    if (envelope.ok && (url.startsWith('https://') || url.startsWith(window.location.origin))) {
      window.location.assign(url);
      return;
    }
    setBusy(null);
    setError(errorMessage(envelope));
  };
  return { open, busy, error };
};

export const UpgradeCard = ({ summary }: { summary: AccountSummary }) => {
  const { open, busy, error } = useAccountLink();
  const target = nextPlan(summary.planId);
  return (
    <section aria-labelledby="upgrade-title" className="flex flex-col gap-3 rounded-2xl border border-accent bg-accent-soft p-5">
      <h2 id="upgrade-title" className="text-lg font-semibold">
        {(summary.creditUsd ?? 0) >= 5 ? 'Included usage is almost used up' : 'Your agent will stop soon'}
      </h2>
      <p className="text-muted">
        {formatUsd(summary.includedLeftUsd ?? 0, 2)} of {formatUsd(summary.includedTotalUsd ?? 0, 2)} included usage is left this period.
        {(summary.creditUsd ?? 0) > 0 ? ` Your ${formatUsd(summary.creditUsd, 2)} of credit is spent next.` : ''}
        {target
          ? ` ${target.name} is $${target.priceUsd} a month with $${target.includedUsd.toLocaleString('en-US')} of usage and ${target.projects} projects.`
          : ' Add credit to keep paid tools running until the renewal.'}
      </p>
      <div className="flex flex-wrap gap-3">
        {target && hasSubscription(summary) ? (
          <Link href={`/app/billing?plan=${target.id}`} className={buttonPrimary}>
            Upgrade to {target.name}
          </Link>
        ) : null}
        {target && !hasSubscription(summary) ? (
          <button type="button" className={buttonPrimary} disabled={!!busy} onClick={() => open('upgrade', { plan: target.id })}>
            Start {target.name}
          </button>
        ) : null}
        <button type="button" className={buttonSecondary} disabled={!!busy} onClick={() => open('top_up')}>
          Add credit
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
};
