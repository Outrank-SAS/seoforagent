'use client';

import { useId, useState } from 'react';
import { api, dataOf, errorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import {
  BACKLINKS_UNAVAILABLE,
  BUYING_PRODUCTS,
  MAX_TOPICS,
  buildBuyingPatch,
  formOf,
  parseTopics,
  readBuyingState,
  saveFailure,
  validDr,
  type BuyingForm,
  type BuyingKey,
  type BuyingState,
  type ProductState,
} from '@/lib/link-buying';
import { pickArray, pickBool, pickNumber, pickString, pickUsd } from '@/lib/pick';
import { BACKLINK_CREDIT_USD, BACKLINK_MAX_DR, BACKLINK_MIN_DR, LINK_MAX_CREDITS, LINK_MIN_ALLOCATION_CREDITS } from '@/lib/pricing';
import { buttonDark, buttonPrimary, buttonSecondary, inputClass } from '@/lib/styles';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { Card, EmptyState, ErrorState, Modal, Notice, SkeletonRows, Stat, shortDate } from './widgets';

type Loose = Record<string, unknown>;

const SAVE_ERROR = 'Something went wrong on our side. Try again in a moment.';
const PRODUCT_LABELS: Record<string, string> = { backlink: 'Backlink', listicle: 'Listicle' };
const UNIT: Record<BuyingKey, { one: string; many: string }> = {
  backlinks: { one: 'backlink', many: 'backlinks' },
  listicles: { one: 'listicle', many: 'listicles' },
};

const count = (value: number): string => value.toLocaleString('en-US');

interface SaveNotice {
  tone: 'ok' | 'danger';
  message: string;
  blockers: string[];
}

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
      <p className="text-sm text-muted">Backlinks and listicles both point to these pages.</p>
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

const ProductCard = ({
  product,
  creditUsd,
  dr,
  enabled,
  budget,
  topics,
  onEnabled,
  onBudget,
  onTopics,
}: {
  product: ProductState;
  creditUsd: number;
  dr: number;
  enabled: boolean;
  budget: string;
  topics?: string;
  onEnabled: (value: boolean) => void;
  onBudget: (value: string) => void;
  onTopics?: (value: string) => void;
}) => {
  const id = useId();
  const unit = UNIT[product.key];
  const perLink = Math.round(dr * product.creditsPerDr);
  const budgetNumber = Number(budget || 0);
  const perMonth = perLink > 0 && Number.isFinite(budgetNumber) ? Math.floor(budgetNumber / perLink) : 0;
  const on = product.available && enabled;
  const topicCount = topics === undefined ? 0 : parseTopics(topics).length;

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {product.name}
          </h2>
          <p className="text-sm text-muted">{product.role}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${product.name} ${on ? 'on' : 'off'}`}
          disabled={!product.available}
          onClick={() => onEnabled(!enabled)}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-ok' : 'bg-line'}`}
        >
          <span className={`inline-block h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
      </div>
      <p className="text-sm text-muted">
        {product.what}
        {product.maxLinksPerDay ? ` At most ${product.maxLinksPerDay} a day.` : ''}
      </p>
      <div className="rounded-xl bg-surface p-4">
        <p>
          <span className="font-mono text-2xl font-semibold">{formatUsd(product.creditsPerDr * creditUsd, 2)}</span> <span className="text-sm text-muted">per DR point</span>
        </p>
        <p className="text-sm text-muted">
          At DR {dr}, one {unit.one} is {count(perLink)} credits ({formatUsd(perLink * creditUsd, 2)}).
        </p>
      </div>
      {!product.available ? <Notice>{product.blockers[0] ?? BACKLINKS_UNAVAILABLE}</Notice> : null}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-budget`} className="text-sm font-medium">
          Monthly budget in credits ({product.minBudget} or more)
        </label>
        <input
          id={`${id}-budget`}
          type="number"
          min={product.minBudget}
          max={LINK_MAX_CREDITS}
          step={10}
          value={budget}
          placeholder={String(perLink * 2)}
          disabled={!product.available}
          onChange={(event) => onBudget(event.target.value)}
          aria-describedby={`${id}-budget-help`}
          className={`${inputClass} font-mono disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted`}
        />
        <p id={`${id}-budget-help`} className="text-sm text-muted" aria-live="polite">
          {!product.available
            ? ''
            : perMonth > 0
              ? `About ${count(perMonth)} ${perMonth === 1 ? unit.one : unit.many} a month at DR ${dr}.`
              : `One DR ${dr} ${unit.one} needs a budget of ${count(perLink)} credits.`}
        </p>
      </div>
      {topics !== undefined && onTopics ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-topics`} className="text-sm font-medium">
            Topics of list articles to appear in (optional)
          </label>
          <textarea
            id={`${id}-topics`}
            rows={2}
            value={topics}
            placeholder="ai video editors, tools for youtubers"
            onChange={(event) => onTopics(event.target.value)}
            aria-describedby={`${id}-topics-help`}
            aria-invalid={topicCount > MAX_TOPICS}
            className={`${inputClass} py-2 text-sm`}
          />
          <p id={`${id}-topics-help`} className={`text-sm ${topicCount > MAX_TOPICS ? 'text-danger' : 'text-muted'}`}>
            Separate topics with commas or new lines. {topicCount} of {MAX_TOPICS}.
          </p>
        </div>
      ) : null}
      <p className="border-t border-line pt-3 text-sm text-muted">
        Spent this month: <span className="font-mono font-semibold text-ink">{count(product.spent)}</span>
        {product.budget > 0 ? ` of ${count(product.budget)}` : ''} credits
      </p>
      {product.available && product.blockers.length > 0 ? (
        <Notice tone="warn">
          <p className="font-semibold">{product.enabled ? 'Nothing can be placed until this is fixed:' : 'Before this can be turned on:'}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {product.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
    </section>
  );
};

const BuyingForm = ({
  projectId,
  state,
  notice,
  onNotice,
  onReload,
}: {
  projectId: string;
  state: BuyingState;
  notice: SaveNotice | null;
  onNotice: (notice: SaveNotice | null) => void;
  onReload: () => void;
}) => {
  const id = useId();
  const patch = usePatchBacklinks(projectId);
  const [form, setForm] = useState<BuyingForm>(() => formOf(state));
  const [busy, setBusy] = useState(false);
  const dr = validDr(form.minDr, state.minDr);

  const setProduct = (key: BuyingKey, change: Partial<{ enabled: boolean; budget: string }>) =>
    setForm((previous) => ({ ...previous, products: { ...previous.products, [key]: { ...previous.products[key], ...change } } }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const { body, error } = buildBuyingPatch(state, form);
    if (!body) {
      onNotice({ tone: 'danger', message: error, blockers: [] });
      return;
    }
    if (Object.keys(body).length === 0) {
      onNotice({ tone: 'ok', message: 'Nothing changed.', blockers: [] });
      return;
    }
    setBusy(true);
    onNotice(null);
    const { envelope, status } = await patch(body);
    setBusy(false);
    if (envelope.ok) {
      onNotice({ tone: 'ok', message: 'Saved. Outrank matching uses these rules from now on.', blockers: [] });
      onReload();
      return;
    }
    onNotice({ tone: 'danger', ...saveFailure(envelope, SAVE_ERROR) });
    if (status === 409) onReload();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 lg:grid-cols-2">
        {BUYING_PRODUCTS.map(({ key }) => (
          <ProductCard
            key={key}
            product={state.products[key]}
            creditUsd={state.creditUsd}
            dr={dr}
            enabled={form.products[key].enabled}
            budget={form.products[key].budget}
            topics={key === 'listicles' ? form.topics : undefined}
            onEnabled={(value) => setProduct(key, { enabled: value })}
            onBudget={(value) => setProduct(key, { budget: value })}
            onTopics={key === 'listicles' ? (value) => setForm((previous) => ({ ...previous, topics: value })) : undefined}
          />
        ))}
      </div>
      <Card title="Shared by both products">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-dr`} className="text-sm font-medium">
              Minimum DR, {BACKLINK_MIN_DR} to {BACKLINK_MAX_DR}
            </label>
            <input
              id={`${id}-dr`}
              type="number"
              min={BACKLINK_MIN_DR}
              max={BACKLINK_MAX_DR}
              value={form.minDr}
              onChange={(event) => setForm((previous) => ({ ...previous, minDr: event.target.value }))}
              aria-describedby={`${id}-dr-help`}
              className={`${inputClass} font-mono sm:w-40`}
            />
            <p id={`${id}-dr-help`} className="text-sm text-muted">
              No link is placed on a site below this DR. A higher DR costs more credits per link.
            </p>
          </div>
          <button type="submit" className={buttonDark} disabled={busy}>
            {busy ? <Spinner /> : null}
            Save budgets and rules
          </button>
        </div>
        {notice ? (
          <Notice tone={notice.tone}>
            <p>{notice.message}</p>
            {notice.blockers.length > 0 ? (
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {notice.blockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            ) : null}
          </Notice>
        ) : null}
      </Card>
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

const buysOf = (data: unknown): string => {
  const dr = pickNumber(data, ['buys_at_min_dr.domain_rating']);
  const backlinks = pickNumber(data, ['buys_at_min_dr.backlinks']);
  const listicles = pickNumber(data, ['buys_at_min_dr.listicles']);
  if (dr === undefined || backlinks === undefined || listicles === undefined) return pickString(data, ['buys']);
  return `At DR ${dr}, this pays for about ${count(backlinks)} ${backlinks === 1 ? 'backlink' : 'backlinks'} or ${count(listicles)} ${listicles === 1 ? 'listicle' : 'listicles'}. Your monthly budgets decide the split.`;
};

const AddCredit = ({ projectId, state, onDone }: { projectId: string; state: BuyingState | null; onDone: () => void }) => {
  const id = useId();
  const { apiKey, refreshWhoami } = useDashboard();
  const [credits, setCredits] = useState('160');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<{ busy: 'quote' | 'allocate' | null; message: string | null; ok: boolean }>({ busy: null, message: null, ok: false });
  const creditsNumber = Number(credits);
  const valid = Number.isInteger(creditsNumber) && creditsNumber >= LINK_MIN_ALLOCATION_CREDITS && creditsNumber <= LINK_MAX_CREDITS;
  const creditUsd = state?.creditUsd ?? BACKLINK_CREDIT_USD;
  const costs = state ? BUYING_PRODUCTS.map(({ key }) => `a ${UNIT[key].one} is ${count(Math.round(state.minDr * state.products[key].creditsPerDr))} credits`).join(' and ') : '';

  const getQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setStatus({ busy: 'quote', message: null, ok: false });
    const { envelope } = await api(`/sfa/projects/${encodeURIComponent(projectId)}/backlinks/quote`, { method: 'POST', key: apiKey, body: { credits: creditsNumber } });
    const data = dataOf(envelope);
    const quoteId = pickString(data, ['quote_id']);
    const totalUsd = pickUsd(data, ['total']);
    if (!envelope.ok || !quoteId || totalUsd === undefined) {
      setStatus({ busy: null, message: envelope.ok ? 'The quote came back incomplete. Try again.' : errorMessage(envelope), ok: false });
      return;
    }
    setQuote({ id: quoteId, totalUsd, credits: pickNumber(data, ['credits']) ?? creditsNumber, expiresAt: pickString(data, ['expires_at']), buys: buysOf(data), enough: pickBool(data, ['enough_balance']) ?? true });
    setStatus({ busy: null, message: null, ok: false });
  };

  const allocate = async () => {
    if (!quote) return;
    setStatus({ busy: 'allocate', message: null, ok: false });
    const { envelope } = await api(`/sfa/projects/${encodeURIComponent(projectId)}/backlinks/allocate`, {
      method: 'POST',
      key: apiKey,
      idempotencyKey: `sfa-allocate-${quote.id}`,
      body: { quote_id: quote.id, confirm_usd: quote.totalUsd },
    });
    setQuote(null);
    if (envelope.ok) {
      setStatus({ busy: null, message: `Done. ${count(quote.credits)} backlink credits were added to this project for ${formatUsd(quote.totalUsd, 2)}.`, ok: true });
      onDone();
      void refreshWhoami();
      return;
    }
    setStatus({ busy: null, message: errorMessage(envelope), ok: false });
  };

  return (
    <>
      <form onSubmit={getQuote} className="flex flex-col gap-3" noValidate>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-credits`} className="text-sm font-medium">
              Backlink credits to add, {LINK_MIN_ALLOCATION_CREDITS} to {count(LINK_MAX_CREDITS)}
            </label>
            <input
              id={`${id}-credits`}
              type="number"
              min={LINK_MIN_ALLOCATION_CREDITS}
              max={LINK_MAX_CREDITS}
              step={10}
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
              aria-invalid={!valid}
              aria-describedby={`${id}-credits-help`}
              className={`${inputClass} font-mono sm:w-48`}
            />
          </div>
          <button type="submit" className={buttonSecondary} disabled={!valid || !!status.busy}>
            {status.busy === 'quote' ? <Spinner /> : null}
            Get a quote
          </button>
        </div>
        <p id={`${id}-credits-help`} className={`text-sm ${valid ? 'text-muted' : 'text-danger'}`}>
          {valid
            ? `About ${formatUsd(creditsNumber * creditUsd, 2)} from your credit and included usage, at ${formatUsd(creditUsd, 2)} per credit. The credits pay for both products.${state ? ` At DR ${state.minDr}, ${costs}.` : ''}`
            : `Choose a whole number from ${LINK_MIN_ALLOCATION_CREDITS} to ${count(LINK_MAX_CREDITS)}.`}
        </p>
        {status.message ? <Notice tone={status.ok ? 'ok' : 'danger'}>{status.message}</Notice> : null}
      </form>

      <Modal open={!!quote} title="Confirm the purchase" onClose={() => setQuote(null)}>
        {quote ? (
          <div className="flex flex-col gap-4">
            <p>
              Spend <span className="font-mono font-semibold">{formatUsd(quote.totalUsd, 2)}</span> of your SEOforAgent balance on{' '}
              <span className="font-mono font-semibold">{count(quote.credits)}</span> Outrank backlink credits for this project?
            </p>
            {quote.buys ? <p className="rounded-xl bg-surface p-3 text-sm">{quote.buys}</p> : null}
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
              <button type="button" className={buttonPrimary} onClick={allocate} disabled={status.busy === 'allocate' || !quote.enough}>
                {status.busy === 'allocate' ? <Spinner /> : null}
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
  const [notice, setNotice] = useState<SaveNotice | null>(null);
  const data = buying.envelope?.ok ? dataOf(buying.envelope) : null;
  const state = data ? readBuyingState(data) : null;
  const rows = placements.envelope?.ok ? pickArray(dataOf(placements.envelope), ['placements']) : [];
  const live = rows.filter((row) => pickString(row, ['status']) === 'live');
  const liveOf = (product: string): number => live.filter((row) => pickString(row, ['product']) === product).length;
  const spent = state ? state.products.backlinks.spent + state.products.listicles.spent : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Backlink credits"
          value={state ? count(state.credits) : '...'}
          hint={state ? `Worth ${formatUsd(state.creditsValueUsd, 2)}. They pay for backlinks and listicles.` : undefined}
        />
        <Stat
          label="Credits spent this month"
          value={state ? count(spent) : '...'}
          hint={state ? `Backlinks ${count(state.products.backlinks.spent)}, listicles ${count(state.products.listicles.spent)}` : undefined}
        />
        <Stat label="Live links" value={placements.envelope ? count(live.length) : '...'} hint={live.length > 0 ? `Backlinks ${liveOf('backlink')}, listicles ${liveOf('listicle')}` : undefined} />
      </div>

      {buying.loading && !state ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : null}
      {!buying.loading && buying.envelope && !buying.envelope.ok ? (
        <Card>
          <ErrorState envelope={buying.envelope} onRetry={buying.reload} what="link buying settings" />
        </Card>
      ) : null}
      {state?.pausedReason ? <Notice tone="warn">Link buying is paused: {state.pausedReason.replace(/_/g, ' ')}.</Notice> : null}
      {state ? <BuyingForm key={JSON.stringify([formOf(state), state.products.backlinks.available])} projectId={projectId} state={state} notice={notice} onNotice={setNotice} onReload={buying.reload} /> : null}

      <Card title="Target pages">{data ? <TargetPages projectId={projectId} data={data} onSaved={buying.reload} /> : <SkeletonRows rows={2} />}</Card>

      <Card title="Add backlink credit">
        <AddCredit projectId={projectId} state={state} onDone={buying.reload} />
      </Card>

      <Card title="Placements">
        {placements.loading ? <SkeletonRows /> : null}
        {!placements.loading && placements.envelope && !placements.envelope.ok ? <ErrorState envelope={placements.envelope} onRetry={placements.reload} what="placements" /> : null}
        {!placements.loading && placements.envelope?.ok && rows.length === 0 ? (
          <EmptyState title="Placements appear here once Outrank matches a site within your rules." prompt="Run backlinks_suggest for this project and tell me what a budget would place." />
        ) : null}
        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <caption className="sr-only">Backlink and listicle placements</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Type
                  </th>
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
                  const liveUrl = pickString(row, ['articleUrl']);
                  return (
                    <tr key={pickString(row, ['id'], String(index))} className="border-t border-line">
                      <td className="py-2 pr-3 font-medium">{PRODUCT_LABELS[pickString(row, ['product'])] ?? ''}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONES[status.split(' ')[0]] ?? 'bg-surface text-muted'}`}>{status}</span>
                      </td>
                      <td className="py-2 pr-3 font-mono">{pickNumber(row, ['hostDomainRating', 'hostDomainRatingFloor']) ?? ''}</td>
                      <td className="py-2 pr-3 font-mono">
                        {pickNumber(row, ['creditsSpent']) ?? ''}
                        {pickBool(row, ['creditsRefunded']) ? ' refunded' : ''}
                      </td>
                      <td className="max-w-xs truncate py-2 pr-3">
                        {liveUrl.startsWith('http') ? (
                          <a href={liveUrl} rel="nofollow noopener noreferrer" target="_blank" className="underline">
                            {liveUrl.replace(/^https?:\/\//, '')}
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
