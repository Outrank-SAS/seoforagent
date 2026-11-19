'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { api, dataOf, errorMessage } from '@/lib/api';
import { PENDING_KEY_STORAGE, SUPPORT_EMAIL } from '@/lib/config';
import {
  CHECKOUT_STARTED_STORAGE,
  ensurePendingKey,
  getActiveKey,
  isSfaKey,
  keySuffix,
  promotePendingKey,
  readStorage,
  removeStorage,
  storageAvailable,
  writeStorage,
  generateKey,
} from '@/lib/keys';
import { pickBool, pickNumber, pickString, pickUsd } from '@/lib/pick';
import type { Plan } from '@/lib/pricing';
import { buttonDark, buttonPrimary, buttonSecondary } from '@/lib/styles';
import { CopyButton } from './CopyButton';
import { PlanPicker, creditAmountError } from './PlanPicker';
import { PromptCard } from './PromptCard';
import { Pill, Spinner } from './ui';

const POLL_INTERVAL_MS = 2000;
const POLL_WINDOW_MS = 60000;
const CHECKOUT_MEMORY_MS = 24 * 60 * 60 * 1000;

type Phase =
  | { name: 'loading' }
  | { name: 'new' }
  | { name: 'choosing' }
  | { name: 'cancelled' }
  | { name: 'redirecting' }
  | { name: 'redirect_failed'; message: string }
  | { name: 'confirming' }
  | { name: 'confirm_timeout' }
  | { name: 'active'; label: string }
  | { name: 'needs_confirmation' }
  | { name: 'expired' }
  | { name: 'signed_in'; label: string; outrank: boolean };

export interface KeyFlowProps {
  mode: 'home' | 'activate';
  plans: Plan[];
  presetsUsd: number[];
  minUsd: number;
  maxUsd: number;
}

const usd = (value: number): string => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const activeLabel = (data: unknown, plans: Plan[]): string => {
  const kind = pickString(data, ['kind']);
  const planId = pickString(data, ['plan', 'plan.id']);
  const plan = plans.find((item) => item.id === planId);
  if (kind === 'credit') {
    const amount = pickUsd(data, ['credit', 'amount', 'credit_left']);
    return amount !== undefined ? `Active. ${usd(amount)} of credit` : 'Active, with credit';
  }
  if (plan) return `Active. ${plan.name} plan, ${usd(plan.includedUsd)} of usage`;
  return 'Active';
};

const accountLabel = (data: unknown): string => {
  const planLabel = pickString(data, ['access.plan_label']);
  const included = pickNumber(data, ['balance.included_left_usd']);
  const credit = pickNumber(data, ['balance.credit_usd']);
  const amount = included ? `${usd(included)} of usage` : credit ? `${usd(credit)} of credit` : '';
  if (planLabel && amount) return `Active. ${planLabel}, ${amount}`;
  return planLabel ? `Active. ${planLabel}` : 'Active';
};

export const KeyFlow = ({ mode, plans, presetsUsd, minUsd, maxUsd }: KeyFlowProps) => {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [pendingKey, setPendingKey] = useState<string>('');
  const [activeKey, setActiveKeyState] = useState<string | null>(null);
  const [justActivatedKey, setJustActivatedKey] = useState<string | null>(null);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [kind, setKind] = useState<'plan' | 'credit'>('plan');
  const [plan, setPlan] = useState<string>(plans[0]?.id ?? 'starter');
  const [amount, setAmount] = useState<string>(String(presetsUsd[1] ?? presetsUsd[0] ?? 100));
  const pollAbort = useRef<AbortController | null>(null);

  const stopPolling = () => {
    pollAbort.current?.abort();
    pollAbort.current = null;
  };

  const poll = useCallback(
    async (key: string) => {
      stopPolling();
      const controller = new AbortController();
      pollAbort.current = controller;
      setPhase({ name: 'confirming' });
      const started = Date.now();
      while (!controller.signal.aborted && Date.now() - started < POLL_WINDOW_MS) {
        try {
          const { envelope } = await api('/sfa/activation/status', { key, signal: controller.signal });
          const data = dataOf(envelope);
          const status = pickString(data, ['status']);
          if (status === 'active') {
            track('sfa_activation_confirmed', { kind: pickString(data, ['kind']) || undefined, plan: pickString(data, ['plan', 'plan.id']) || undefined });
            promotePendingKey(key);
            setActiveKeyState(key);
            setJustActivatedKey(key);
            setPhase({ name: 'active', label: activeLabel(data, plans) });
            const account = await api('/sfa/whoami', { key });
            if (account.envelope.ok) setPhase({ name: 'active', label: accountLabel(dataOf(account.envelope)) });
            return;
          }
          if (status === 'pending_owner_confirmation') {
            setPhase({ name: 'needs_confirmation' });
            return;
          }
          if (status === 'expired') {
            removeStorage(CHECKOUT_STARTED_STORAGE);
            setPhase({ name: 'expired' });
            return;
          }
        } catch {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
      if (!controller.signal.aborted) setPhase({ name: 'confirm_timeout' });
    },
    [plans],
  );

  useEffect(() => {
    const init = async () => {
      const available = storageAvailable();
      setStorageBlocked(!available);
      const fragment = window.location.hash.replace(/^#/, '');
      const fragmentKey = mode === 'activate' && isSfaKey(fragment) ? fragment : null;
      if (fragmentKey) {
        writeStorage(PENDING_KEY_STORAGE, fragmentKey);
        removeStorage(CHECKOUT_STARTED_STORAGE);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      const search = new URLSearchParams(window.location.search);
      const sessionId = mode === 'activate' ? search.get('session_id') : null;
      const cancelled = search.get('activation') === 'cancelled';
      if (cancelled) {
        removeStorage(CHECKOUT_STARTED_STORAGE);
        window.history.replaceState(null, '', window.location.pathname);
      }
      const stored = getActiveKey();

      if (stored && !fragmentKey && !sessionId) {
        setActiveKeyState(stored);
        setPhase({ name: 'signed_in', label: 'Active', outrank: false });
        const { envelope } = await api('/sfa/whoami', { key: stored });
        if (envelope.ok) {
          const data = dataOf(envelope);
          const outrank = pickString(data, ['access.plan']) === 'outrank_included';
          const active = pickBool(data, ['access.active']) ?? true;
          setPhase({
            name: 'signed_in',
            label: outrank ? 'Included with your Outrank plan' : active ? accountLabel(data) : 'Signed in, no plan yet',
            outrank,
          });
        }
        return;
      }

      const pending = fragmentKey
        ? { key: fragmentKey, persisted: available, created: false }
        : available
          ? ensurePendingKey()
          : { key: generateKey(), persisted: false, created: true };
      if (pending.created) track('sfa_key_generated');
      setPendingKey(pending.key);
      const startedAt = Number(readStorage(CHECKOUT_STARTED_STORAGE) || 0);
      const recentCheckout = startedAt > 0 && Date.now() - startedAt < CHECKOUT_MEMORY_MS;
      if (sessionId || (recentCheckout && !fragmentKey)) {
        void poll(pending.key);
        return;
      }
      if (cancelled) {
        setPhase({ name: 'cancelled' });
        return;
      }
      setPhase(mode === 'activate' ? { name: 'choosing' } : { name: 'new' });
    };
    void init();
    return () => stopPolling();
  }, [mode, poll]);

  const startCheckout = async () => {
    if (kind === 'credit' && creditAmountError(amount, minUsd, maxUsd)) return;
    setPhase({ name: 'redirecting' });
    const body =
      kind === 'plan'
        ? { key: pendingKey, kind, plan, return_origin: window.location.origin, referral: window.Rewardful?.referral }
        : { key: pendingKey, kind, amount_usd: Number(amount), return_origin: window.location.origin, referral: window.Rewardful?.referral };
    const { envelope } = await api('/sfa/activation/checkout', { method: 'POST', body });
    const url = pickString(dataOf(envelope), ['checkout_url']);
    if (envelope.ok && url.startsWith('https://')) {
      track('sfa_checkout_started', {
        kind,
        plan: kind === 'plan' ? plan : undefined,
        amount_usd: kind === 'plan' ? plans.find((item) => item.id === plan)?.priceUsd : Number(amount),
      });
      writeStorage(CHECKOUT_STARTED_STORAGE, String(Date.now()));
      window.location.assign(url);
      return;
    }
    setPhase({ name: 'redirect_failed', message: errorMessage(envelope) });
  };

  const restart = () => {
    stopPolling();
    removeStorage(CHECKOUT_STARTED_STORAGE);
    removeStorage(PENDING_KEY_STORAGE);
    const next = storageBlocked ? { key: generateKey() } : ensurePendingKey();
    track('sfa_key_generated');
    setPendingKey(next.key);
    setPhase(mode === 'activate' ? { name: 'choosing' } : { name: 'new' });
  };

  const selectedPlan = plans.find((item) => item.id === plan);
  const continueLabel =
    kind === 'plan'
      ? `Continue to Stripe, ${selectedPlan ? `$${selectedPlan.priceUsd} a month` : 'monthly'}`
      : `Continue to Stripe, $${Number(amount || 0).toLocaleString('en-US')} once`;
  const priceFrom = plans.length > 0 ? Math.min(...plans.map((item) => item.priceUsd)) : 9;
  const showFullKey = ['new', 'choosing', 'cancelled', 'redirecting', 'redirect_failed', 'confirming', 'confirm_timeout', 'needs_confirmation', 'expired'].includes(phase.name);
  const promptKey = justActivatedKey ?? (showFullKey ? pendingKey : null);
  const promptExpanded = phase.name === 'active' || phase.name === 'signed_in';

  const pill = (() => {
    switch (phase.name) {
      case 'loading':
        return <Pill tone="neutral">Preparing your key</Pill>;
      case 'new':
      case 'choosing':
      case 'cancelled':
        return <Pill tone="warn">Created just now, not active yet</Pill>;
      case 'redirecting':
        return <Pill tone="neutral">Opening Stripe</Pill>;
      case 'redirect_failed':
        return <Pill tone="danger">Stripe did not open</Pill>;
      case 'confirming':
      case 'confirm_timeout':
        return <Pill tone="warn">Confirming payment</Pill>;
      case 'active':
        return <Pill tone="ok">{phase.label}</Pill>;
      case 'needs_confirmation':
        return <Pill tone="warn">Check your email</Pill>;
      case 'expired':
        return <Pill tone="danger">Activation expired</Pill>;
      case 'signed_in':
        return <Pill tone="ok">{phase.label}</Pill>;
    }
  })();

  const displayedKey = phase.name === 'active' || phase.name === 'signed_in' ? keySuffix(activeKey) : pendingKey;

  return (
    <div className="flex flex-col gap-5">
      <section
        id="get-key"
        aria-labelledby="key-card-title"
        className="flex scroll-mt-24 flex-col gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(13,13,18,0.04),0_12px_32px_-16px_rgba(13,13,18,0.18)] sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="key-card-title" className="text-lg font-semibold tracking-tight">
            Your API key
          </h2>
          <div aria-live="polite">{pill}</div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl bg-ink p-2 pl-4 sm:flex-row sm:items-center">
          <code
            data-testid="api-key"
            className="min-w-0 flex-1 py-2 font-mono text-[14px] tracking-tight break-all text-white/90"
            aria-label={showFullKey ? 'Your API key' : 'Your API key, last characters'}
          >
            {phase.name === 'loading' ? <span className="text-white/60">sfa_live_...</span> : displayedKey}
          </code>
          {showFullKey && pendingKey ? <CopyButton text={pendingKey} variant="dark" onCopied={() => track('sfa_key_copied')} /> : null}
        </div>

        {storageBlocked && showFullKey ? (
          <p role="note" className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
            Your browser blocks storage for this site, so this key changes if you reload. Copy it now, or allow site data and reload.
          </p>
        ) : null}

        {phase.name === 'new' ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
            <button
              type="button"
              onClick={() => {
                track('sfa_activate_clicked');
                setPhase({ name: 'choosing' });
              }}
              className={`${buttonPrimary} group min-h-13 w-full px-7 text-base shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_6px_16px_-6px_rgba(194,65,12,0.55)] sm:w-auto`}
            >
              Activate this key
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:translate-x-0.5"
              >
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
            <ul className="grid gap-1.5 text-sm text-muted">
              {[`From $${priceFrom} a month, or credit once`, 'Works the second Stripe confirms', 'No sign-up form, no trial to cancel'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {phase.name === 'choosing' || phase.name === 'cancelled' || phase.name === 'redirecting' || phase.name === 'redirect_failed' ? (
          <div className="flex flex-col gap-4 border-t border-line pt-5">
            <h3 className="font-semibold">Choose how to activate this key</h3>
            <PlanPicker
              plans={plans}
              presetsUsd={presetsUsd}
              minUsd={minUsd}
              maxUsd={maxUsd}
              kind={kind}
              plan={plan}
              amount={amount}
              onKind={setKind}
              onPlan={setPlan}
              onAmount={setAmount}
            />
            {phase.name === 'cancelled' ? (
              <p role="status" className="rounded-lg bg-surface p-3 text-sm">
                Checkout was cancelled and nothing was charged. Pick a plan or an amount to try again.
              </p>
            ) : null}
            {phase.name === 'redirect_failed' ? (
              <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger">
                We could not open Stripe. {phase.message}
              </p>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={startCheckout}
                disabled={phase.name === 'redirecting' || (kind === 'credit' && !!creditAmountError(amount, minUsd, maxUsd))}
                className={`${buttonPrimary} min-h-12`}
              >
                {phase.name === 'redirecting' ? <Spinner /> : null}
                {phase.name === 'redirecting' ? 'Opening Stripe' : phase.name === 'redirect_failed' ? 'Retry' : continueLabel}
              </button>
              {mode === 'home' ? (
                <button type="button" onClick={() => setPhase({ name: 'new' })} className={buttonSecondary} disabled={phase.name === 'redirecting'}>
                  Back
                </button>
              ) : null}
            </div>
            <p className="text-sm text-muted">The email you enter on Stripe becomes your sign-in. If it already has an account, we email it to confirm first.</p>
          </div>
        ) : null}

        {phase.name === 'confirming' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[15px] text-muted">
              <Spinner /> Waiting for Stripe to confirm the payment. This usually takes a few seconds.
            </p>
            <button
              type="button"
              onClick={() => {
                stopPolling();
                removeStorage(CHECKOUT_STARTED_STORAGE);
                setPhase({ name: 'choosing' });
              }}
              className={`${buttonSecondary} text-sm`}
            >
              Did not pay? Choose again
            </button>
          </div>
        ) : null}

        {phase.name === 'confirm_timeout' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={() => void poll(pendingKey)} className={buttonDark}>
              Check again
            </button>
            <p className="text-sm text-muted">
              Still not confirmed. If you paid, it can take a minute. Otherwise write to{' '}
              <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
              , or{' '}
              <button type="button" onClick={restart} className="min-h-11 underline">
                start over with a new key
              </button>
              .
            </p>
          </div>
        ) : null}

        {phase.name === 'needs_confirmation' ? (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-muted">
              This email already has an account. We sent a link to confirm it is you. Open it on any device and this key turns active.
            </p>
            <div>
              <button type="button" onClick={() => void poll(pendingKey)} className={buttonSecondary}>
                I confirmed, check again
              </button>
            </div>
          </div>
        ) : null}

        {phase.name === 'expired' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button type="button" onClick={restart} className={buttonPrimary}>
              Start again
            </button>
            <p className="text-sm text-muted">This activation was not paid within 24 hours. Start again with a new key.</p>
          </div>
        ) : null}

        {phase.name === 'active' ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/app" className={`${buttonDark} min-h-14 px-8 text-lg`}>
              Open dashboard
            </Link>
            <p className="text-[15px] text-muted">
              Your key is live. Paste the prompt below into your agent, then go back to it and say: done. A receipt is in your inbox.
            </p>
          </div>
        ) : null}

        {phase.name === 'signed_in' ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href="/app" className={buttonDark}>
              Open dashboard
            </Link>
            <Link href="/app/keys" className={buttonSecondary}>
              {phase.outrank ? 'Create a key' : 'Create another key'}
            </Link>
            <p className="text-sm text-muted">This browser is signed in. New keys are shown once, with their setup prompt.</p>
          </div>
        ) : null}

        {phase.name === 'new' ? (
          <p className="-mx-5 -mb-5 flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-line bg-surface/60 px-5 py-3.5 text-sm text-muted sm:-mx-7 sm:-mb-7 sm:px-7">
            <span>Already on Outrank? SEOforAgent is included with your plan.</span>
            <Link href="/app" className="inline-flex min-h-9 items-center gap-1 font-medium text-ink hover:text-accent">
              Sign in
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        ) : null}
      </section>

      {phase.name !== 'loading' && promptExpanded ? (
        <PromptCard
          apiKey={promptKey}
          note={
            phase.name === 'signed_in'
              ? 'For security the full key is not shown again. Create a key in the dashboard to get this prompt with the key inside.'
              : undefined
          }
        />
      ) : null}

      {phase.name !== 'loading' && !promptExpanded ? (
        <details className="group flex flex-col">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-3 transition-colors hover:border-ink/25 sm:px-7 [&::-webkit-details-marker]:hidden">
            <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <span className="font-medium text-ink">How do I connect my agent?</span>
              <span className="text-sm text-muted">Two steps</span>
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0 text-faint transition-transform group-open:rotate-180"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3.5 6l4.5 4.5L12.5 6" />
            </svg>
          </summary>
          <div className="pt-3">
            <PromptCard apiKey={promptKey} />
          </div>
        </details>
      ) : null}
    </div>
  );
};
