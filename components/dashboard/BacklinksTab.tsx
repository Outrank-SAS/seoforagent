'use client';

import { useId, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pick, pickArray, pickBool, pickNumber, pickString, pickUsd } from '@/lib/pick';
import { BACKLINK_CREDIT_USD, BACKLINK_CREDITS_PER_DR } from '@/lib/pricing';
import { buttonDark, buttonPrimary, buttonSecondary, inputClass } from '@/lib/styles';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { Card, EmptyState, ErrorState, Modal, Notice, SkeletonRows, shortDate } from './widgets';

type Loose = Record<string, unknown>;

const MIN_CREDITS = 120;
const MAX_CREDITS = 20000;

interface TargetPage {
  id: string;
  url: string;
  status: string;
  liveLinks: number;
}

const targetPagesOf = (data: Loose): TargetPage[] =>
  pickArray(data, ['target_pages']).map((item) => ({
    id: pickString(item, ['id']),
    url: pickString(item, ['url']),
    status: pickString(item, ['status'], 'active'),
    liveLinks: pickNumber(item, ['live_links']) ?? 0,
  }));

const usePatchBacklinks = (projectId: string) => {
  const { apiKey } = useDashboard();
  return (body: Record<string, unknown>) => api(`/sfa/projects/${encodeURIComponent(projectId)}/backlinks`, { method: 'PATCH', key: apiKey, body });
};

const TargetPages = ({ projectId, data, onSaved }: { projectId: string; data: Loose; onSaved: () => void }) => {
  const id = useId();
  const patch = usePatchBacklinks(projectId);
  const pages = targetPagesOf(data);
  const [url, setUrl] = useState('');
  const [state, setState] = useState<{ busy: string | null; message: string | null; ok: boolean }>({ busy: null, message: null, ok: false });

  const run = async (busy: string, body: Record<string, unknown>, done: string) => {
    setState({ busy, message: null, ok: false });
    const { envelope } = await patch({ target_pages: body });
    setState({ busy: null, message: envelope.ok ? done : errorMessage(envelope), ok: envelope.ok });
    if (envelope.ok) onSaved();
  };

  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = url.trim();
    if (!/^https?:\/\/\S+\.\S+/.test(clean)) {
      setState({ busy: null, message: 'Enter a full URL on your site, starting with https://.', ok: false });
      return;
    }
    void run('add', { add: [clean] }, 'Target page added.').then(() => setUrl(''));
  };

  return (
    <div className="flex flex-col gap-3">
      {pages.length === 0 ? (
        <p className="text-sm text-muted">No target page yet. Add the pages links should point to, such as your homepage or a product page.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {pages.map((page) => (
            <li key={page.id || page.url} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-xs">{page.url}</span>
                <span className="text-muted">
                  {page.status === 'active' ? 'Active' : page.status === 'paused' ? 'Paused' : page.status}, {page.liveLinks} live {page.liveLinks === 1 ? 'link' : 'links'}
                </span>
              </span>
              {page.id ? (
                <span className="flex gap-1">
                  <button
                    type="button"
                    className="min-h-11 px-2 font-medium underline"
                    disabled={!!state.busy}
                    onClick={() =>
                      run(page.id, page.status === 'paused' ? { activate: [page.id] } : { pause: [page.id] }, page.status === 'paused' ? 'Target page active again.' : 'Target page paused.')
                    }
                  >
                    {page.status === 'paused' ? 'Activate' : 'Pause'}
                  </button>
                  <button type="button" className="min-h-11 px-2 font-medium text-danger underline" disabled={!!state.busy} onClick={() => run(page.id, { remove: [page.id] }, 'Target page removed.')}>
                    Remove
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {pages.length < 10 ? (
        <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row sm:items-end" noValidate>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={`${id}-url`} className="text-sm font-medium">
              Add a target page
            </label>
            <input id={`${id}-url`} type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/pricing" className={`${inputClass} font-mono text-sm`} />
          </div>
          <button type="submit" className={buttonSecondary} disabled={!!state.busy}>
            {state.busy === 'add' ? <Spinner /> : null}
            Add page
          </button>
        </form>
      ) : null}
      {state.message ? <Notice tone={state.ok ? 'ok' : 'danger'}>{state.message}</Notice> : null}
    </div>
  );
};

const RulesForm = ({ projectId, data, onSaved }: { projectId: string; data: Loose; onSaved: () => void }) => {
  const id = useId();
  const patch = usePatchBacklinks(projectId);
  const initialBudget = pickNumber(data, ['monthly_credit_budget']) ?? 0;
  const initialDr = pickNumber(data, ['min_domain_rating']) ?? 40;
  const initialListicle = pickBool(data, ['prefer_listicle']) ?? false;
  const initialEnabled = pickBool(data, ['enabled']) ?? false;
  const [budget, setBudget] = useState(initialBudget ? String(initialBudget) : '');
  const [minDr, setMinDr] = useState(String(initialDr));
  const [preferListicle, setPreferListicle] = useState(initialListicle);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [state, setState] = useState<{ busy: boolean; message: string | null; ok: boolean }>({ busy: false, message: null, ok: false });

  const budgetNumber = Number(budget || 0);
  const drNumber = Number(minDr);
  const perLink = drNumber * BACKLINK_CREDITS_PER_DR;
  const linksPerMonth = perLink > 0 ? Math.floor(budgetNumber / perLink) : 0;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const body: Record<string, unknown> = {};
    if (budgetNumber !== initialBudget) {
      if (!Number.isInteger(budgetNumber) || budgetNumber < MIN_CREDITS || budgetNumber > MAX_CREDITS) {
        setState({ busy: false, message: `The monthly budget must be from ${MIN_CREDITS} to ${MAX_CREDITS.toLocaleString('en-US')} credits.`, ok: false });
        return;
      }
      body.monthly_credit_budget = budgetNumber;
    }
    if (drNumber !== initialDr) {
      if (!Number.isInteger(drNumber) || drNumber < 30 || drNumber > 70) {
        setState({ busy: false, message: 'Minimum DR must be from 30 to 70.', ok: false });
        return;
      }
      body.min_domain_rating = drNumber;
    }
    if (preferListicle !== initialListicle) body.prefer_listicle = preferListicle;
    if (enabled !== initialEnabled) body.enabled = enabled;
    if (Object.keys(body).length === 0) {
      setState({ busy: false, message: 'Nothing changed.', ok: true });
      return;
    }
    setState({ busy: true, message: null, ok: false });
    const { envelope } = await patch(body);
    setState({ busy: false, message: envelope.ok ? 'Saved. Outrank matching uses these rules from now on.' : errorMessage(envelope), ok: envelope.ok });
    if (envelope.ok) onSaved();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <div className="flex items-center justify-between gap-4 rounded-xl bg-surface p-4">
        <div>
          <p id={`${id}-enabled-label`} className="font-semibold">
            Automatic placement
          </p>
          <p className="text-sm text-muted">When on, Outrank places links within the budget. Needs credits, a budget and one active target page.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={`${id}-enabled-label`}
          onClick={() => setEnabled((value) => !value)}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-ok' : 'bg-line'}`}
        >
          <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
          <span className="sr-only">{enabled ? 'On' : 'Off'}</span>
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-budget`} className="text-sm font-medium">
            Monthly budget in backlink credits ({MIN_CREDITS} or more)
          </label>
          <input
            id={`${id}-budget`}
            type="number"
            min={MIN_CREDITS}
            max={MAX_CREDITS}
            step={10}
            value={budget}
            placeholder="200"
            onChange={(event) => setBudget(event.target.value)}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-dr`} className="text-sm font-medium">
            Minimum DR, 30 to 70
          </label>
          <input id={`${id}-dr`} type="number" min={30} max={70} value={minDr} onChange={(event) => setMinDr(event.target.value)} className={`${inputClass} font-mono`} />
        </div>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {linksPerMonth > 0
          ? `About ${linksPerMonth} ${linksPerMonth === 1 ? 'link' : 'links'} a month at DR ${drNumber} (${perLink} credits, ${formatUsd(perLink * BACKLINK_CREDIT_USD, 2)} each).`
          : `A DR ${drNumber || 30} link costs ${perLink || 120} credits. Raise the budget to place links.`}
      </p>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={preferListicle} onChange={(event) => setPreferListicle(event.target.checked)} className="h-5 w-5 accent-[#c2410c]" />
        <span>Prefer placements inside list articles</span>
      </label>
      <div>
        <button type="submit" className={buttonDark} disabled={state.busy}>
          {state.busy ? <Spinner /> : null}
          Save rules
        </button>
      </div>
      {state.message ? <Notice tone={state.ok ? 'ok' : 'danger'}>{state.message}</Notice> : null}
    </form>
  );
};

interface Quote {
  id: string;
  totalUsd: number;
  credits: number;
  expiresAt: string;
  buys: string;
  enough: boolean;
}

const AddCredit = ({ projectId, onDone }: { projectId: string; onDone: () => void }) => {
  const id = useId();
  const { apiKey, refreshWhoami } = useDashboard();
  const [credits, setCredits] = useState('200');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [state, setState] = useState<{ busy: 'quote' | 'allocate' | null; message: string | null; ok: boolean }>({ busy: null, message: null, ok: false });
  const creditsNumber = Number(credits);
  const valid = Number.isInteger(creditsNumber) && creditsNumber >= MIN_CREDITS && creditsNumber <= MAX_CREDITS;

  const getQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setState({ busy: 'quote', message: null, ok: false });
    const { envelope } = await api(`/sfa/projects/${encodeURIComponent(projectId)}/backlinks/quote`, { method: 'POST', key: apiKey, body: { credits: creditsNumber } });
    const data = dataOf(envelope);
    const quoteId = pickString(data, ['quote_id']);
    const totalUsd = pickUsd(data, ['total']);
    if (!envelope.ok || !quoteId || totalUsd === undefined) {
      setState({ busy: null, message: envelope.ok ? 'The quote came back incomplete. Try again.' : errorMessage(envelope), ok: false });
      return;
    }
    setQuote({ id: quoteId, totalUsd, credits: pickNumber(data, ['credits']) ?? creditsNumber, expiresAt: pickString(data, ['expires_at']), buys: pickString(data, ['buys']), enough: pickBool(data, ['enough_balance']) ?? true });
    setState({ busy: null, message: null, ok: false });
  };

  const allocate = async () => {
    if (!quote) return;
    setState({ busy: 'allocate', message: null, ok: false });
    const { envelope } = await api(`/sfa/projects/${encodeURIComponent(projectId)}/backlinks/allocate`, {
      method: 'POST',
      key: apiKey,
      idempotencyKey: `sfa-allocate-${quote.id}`,
      body: { quote_id: quote.id, confirm_usd: quote.totalUsd },
    });
    setQuote(null);
    if (envelope.ok) {
      setState({ busy: null, message: `Done. ${quote.credits.toLocaleString('en-US')} backlink credits were added to this project for ${formatUsd(quote.totalUsd, 2)}.`, ok: true });
      onDone();
      void refreshWhoami();
      return;
    }
    setState({ busy: null, message: errorMessage(envelope), ok: false });
  };

  return (
    <>
      <form onSubmit={getQuote} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-credits`} className="text-sm font-medium">
              Backlink credits to add, {MIN_CREDITS} to {MAX_CREDITS.toLocaleString('en-US')}
            </label>
            <input
              id={`${id}-credits`}
              type="number"
              min={MIN_CREDITS}
              max={MAX_CREDITS}
              step={10}
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              aria-invalid={!valid}
              aria-describedby={`${id}-credits-help`}
              className={`${inputClass} font-mono sm:w-48`}
            />
          </div>
          <button type="submit" className={buttonSecondary} disabled={!valid || !!state.busy}>
            {state.busy === 'quote' ? <Spinner /> : null}
            Get a quote
          </button>
        </div>
        <p id={`${id}-credits-help`} className={`text-sm ${valid ? 'text-muted' : 'text-danger'}`}>
          {valid
            ? `About ${formatUsd(creditsNumber * BACKLINK_CREDIT_USD, 2)} from your credit and included usage, at ${formatUsd(BACKLINK_CREDIT_USD, 2)} per credit. A DR 50 link is 200 credits.`
            : `Choose a whole number from ${MIN_CREDITS} to ${MAX_CREDITS.toLocaleString('en-US')}.`}
        </p>
        {state.message ? <Notice tone={state.ok ? 'ok' : 'danger'}>{state.message}</Notice> : null}
      </form>

      <Modal open={!!quote} title="Confirm the purchase" onClose={() => setQuote(null)}>
        {quote ? (
          <div className="flex flex-col gap-4">
            <p>
              Spend <span className="font-mono font-semibold">{formatUsd(quote.totalUsd, 2)}</span> of your SEOforAgent balance on{' '}
              <span className="font-mono font-semibold">{quote.credits.toLocaleString('en-US')}</span> Outrank backlink credits for this project?
            </p>
            {quote.buys ? <p className="text-sm text-muted">{quote.buys}</p> : null}
            {!quote.enough ? (
              <Notice tone="warn">
                Your balance is lower than this amount.{' '}
                <a href="/app/billing#add-credit" className="font-semibold underline">
                  Add credit first
                </a>
                .
              </Notice>
            ) : null}
            <p className="text-sm text-muted">
              The amount is taken now and cannot be moved back to your balance. Lost links are refunded in credits.
              {quote.expiresAt ? ` This quote is valid until ${new Date(quote.expiresAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.` : ''}
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={buttonSecondary} onClick={() => setQuote(null)}>
                Cancel
              </button>
              <button type="button" className={buttonPrimary} onClick={allocate} disabled={state.busy === 'allocate' || !quote.enough}>
                {state.busy === 'allocate' ? <Spinner /> : null}
                Pay {formatUsd(quote.totalUsd, 2)}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

const STATUS_TONES: Record<string, string> = {
  live: 'bg-ok-soft text-ok',
  lost: 'bg-danger-soft text-danger',
  publishing: 'bg-warn-soft text-warn',
  verifying: 'bg-warn-soft text-warn',
  matched: 'bg-surface text-muted',
  pending: 'bg-warn-soft text-warn',
  recovering: 'bg-warn-soft text-warn',
  failed: 'bg-danger-soft text-danger',
  rejected: 'bg-danger-soft text-danger',
};

export const BacklinksTab = ({ projectId }: { projectId: string }) => {
  const base = `/sfa/projects/${encodeURIComponent(projectId)}/backlinks`;
  const buying = useApiGet(base);
  const placements = useApiGet(`${base}/placements`);
  const data = buying.envelope?.ok ? dataOf(buying.envelope) : null;
  const rows = placements.envelope?.ok ? pickArray(dataOf(placements.envelope), ['placements']) : [];
  const blockers = data ? pick(data, ['blockers']) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Backlink credits</p>
          <p className="font-mono text-2xl font-semibold">{data ? (pickNumber(data, ['credits']) ?? 0).toLocaleString('en-US') : '...'}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Credits spent this month</p>
          <p className="font-mono text-2xl font-semibold">{data ? (pickNumber(data, ['spent_this_month']) ?? 0).toLocaleString('en-US') : '...'}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-sm text-muted">Live links</p>
          <p className="font-mono text-2xl font-semibold">{rows.filter((row) => pickString(row, ['status']) === 'live').length}</p>
        </div>
      </div>

      <Card title="Budget and rules">
        {buying.loading ? <SkeletonRows rows={3} /> : null}
        {!buying.loading && buying.envelope && !buying.envelope.ok ? <ErrorState envelope={buying.envelope} onRetry={buying.reload} what="backlink settings" /> : null}
        {Array.isArray(blockers) && blockers.length > 0 ? (
          <Notice tone="warn">Buying is blocked: {blockers.map((item) => (typeof item === 'string' ? item : pickString(item, ['message', 'reason']))).join(' ')}</Notice>
        ) : null}
        {data ? <RulesForm key={JSON.stringify(data)} projectId={projectId} data={data} onSaved={buying.reload} /> : null}
      </Card>

      <Card title="Target pages">
        {data ? <TargetPages projectId={projectId} data={data} onSaved={buying.reload} /> : <SkeletonRows rows={2} />}
      </Card>

      <Card title="Add backlink credit">
        <AddCredit projectId={projectId} onDone={buying.reload} />
      </Card>

      <Card title="Placements">
        {placements.loading ? <SkeletonRows /> : null}
        {!placements.loading && placements.envelope && !placements.envelope.ok ? <ErrorState envelope={placements.envelope} onRetry={placements.reload} what="placements" /> : null}
        {!placements.loading && placements.envelope?.ok && rows.length === 0 ? (
          <EmptyState title="Placements appear here once Outrank matches a site within your rules." prompt="Run backlinks_suggest for this project and tell me what a budget would place." />
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="sr-only">Backlink placements</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    State
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    DR
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Credits
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Live URL
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const status = pickString(row, ['status'], 'matched').replace(/_/g, ' ');
                  const live = pickString(row, ['articleUrl']);
                  return (
                    <tr key={pickString(row, ['id'], String(index))} className="border-t border-line">
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONES[status.split(' ')[0]] ?? 'bg-surface text-muted'}`}>{status}</span>
                      </td>
                      <td className="py-2 pr-3 font-mono">{pickNumber(row, ['hostDomainRating', 'hostDomainRatingFloor']) ?? ''}</td>
                      <td className="py-2 pr-3 font-mono">{pickNumber(row, ['creditsSpent']) ?? ''}{pickBool(row, ['creditsRefunded']) ? ' refunded' : ''}</td>
                      <td className="max-w-xs truncate py-2 pr-3">
                        {live.startsWith('http') ? (
                          <a href={live} rel="nofollow noopener noreferrer" target="_blank" className="underline">
                            {live.replace(/^https?:\/\//, '')}
                          </a>
                        ) : (
                          <span className="text-muted">Not live yet</span>
                        )}
                      </td>
                      <td className="py-2 text-muted">{shortDate(pickString(row, ['publishedAt', 'createdAt']))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
};
