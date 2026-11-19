'use client';

import { useEffect, useId, useState } from 'react';
import { hasSubscription, summarizeAccount } from '@/lib/account';
import { api, dataOf, errorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/format';
import { pickArray, pickNumber, pickString } from '@/lib/pick';
import { CREDIT_MAX_USD, CREDIT_MIN_USD, CREDIT_PRESETS_USD, FALLBACK_PLANS } from '@/lib/pricing';
import { buttonDark, buttonPrimary, buttonSecondary, inputClass } from '@/lib/styles';
import { Spinner } from '../ui';
import { useApiGet, useDashboard } from './context';
import { useAccountLink } from './UpgradeCard';
import { Card, EmptyState, ErrorState, Modal, Notice, SkeletonRows, relativeTime, shortDate } from './widgets';

const LimitsForm = ({ perCall, daily, onSaved }: { perCall?: number; daily?: number; onSaved: () => void }) => {
  const id = useId();
  const { apiKey } = useDashboard();
  const [perCallValue, setPerCall] = useState(perCall !== undefined ? String(perCall) : '');
  const [dailyValue, setDaily] = useState(daily !== undefined ? String(daily) : '');
  const [state, setState] = useState<{ busy: boolean; message: string | null; ok: boolean }>({ busy: false, message: null, ok: false });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const perCallNumber = Number(perCallValue);
    const dailyNumber = Number(dailyValue);
    if (!(perCallNumber >= 0.01) || !(dailyNumber >= 1)) {
      setState({ busy: false, message: 'The per-call limit must be at least $0.01 and the daily limit at least $1.', ok: false });
      return;
    }
    if (perCallNumber > dailyNumber) {
      setState({ busy: false, message: 'The per-call limit cannot be higher than the daily limit.', ok: false });
      return;
    }
    setState({ busy: true, message: null, ok: false });
    const { envelope } = await api('/sfa/wallet', {
      method: 'PATCH',
      key: apiKey,
      body: { per_call_limit_usd: perCallNumber, daily_limit_usd: dailyNumber },
    });
    setState({ busy: false, message: envelope.ok ? 'Limits saved.' : errorMessage(envelope), ok: envelope.ok });
    if (envelope.ok) onSaved();
  };

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-call`} className="text-sm font-medium">
          Most one call can cost, in dollars
        </label>
        <input
          id={`${id}-call`}
          type="number"
          min={0.01}
          step={0.01}
          inputMode="decimal"
          value={perCallValue}
          onChange={(event) => setPerCall(event.target.value)}
          className={`${inputClass} font-mono`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-day`} className="text-sm font-medium">
          Most your agents can spend a day, in dollars
        </label>
        <input
          id={`${id}-day`}
          type="number"
          min={1}
          step={1}
          inputMode="decimal"
          value={dailyValue}
          onChange={(event) => setDaily(event.target.value)}
          className={`${inputClass} font-mono`}
        />
      </div>
      <button type="submit" className={buttonDark} disabled={state.busy}>
        {state.busy ? <Spinner /> : null}
        Save limits
      </button>
      {state.message ? (
        <div className="sm:col-span-3">
          <Notice tone={state.ok ? 'ok' : 'danger'}>{state.message}</Notice>
        </div>
      ) : null}
    </form>
  );
};

const CHECKOUT_NOTICES: Record<string, { tone: 'ok' | 'neutral'; text: string }> = {
  success: { tone: 'ok', text: 'Payment received. Balances can take a few seconds to update.' },
  cancelled: { tone: 'neutral', text: 'Checkout cancelled. Nothing was charged.' },
};

export const BillingView = () => {
  const id = useId();
  const { apiKey, whoami, refreshWhoami } = useDashboard();
  const wallet = useApiGet('/sfa/wallet');
  const { open, busy, error } = useAccountLink();
  const [plan, setPlan] = useState('growth');
  const [amount, setAmount] = useState('100');
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<string | null>(null);
  const [change, setChange] = useState<{ busy: boolean; message: string | null; ok: boolean }>({ busy: false, message: null, ok: false });
  const summary = whoami?.ok ? summarizeAccount(whoami.data) : null;
  const subscribed = hasSubscription(summary);
  const walletData = wallet.envelope?.ok ? dataOf(wallet.envelope) : null;
  const ledger = walletData ? pickArray(walletData, ['ledger']) : [];
  const perCall = walletData ? pickNumber(walletData, ['limits.per_call_usd']) : undefined;
  const daily = walletData ? pickNumber(walletData, ['limits.daily_usd']) : undefined;
  const amountNumber = Number(amount);
  const amountValid = Number.isInteger(amountNumber) && amountNumber >= CREDIT_MIN_USD && amountNumber <= CREDIT_MAX_USD;
  const confirmTarget = FALLBACK_PLANS.find((item) => item.id === confirmPlan);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('plan');
    const checkout = params.get('checkout');
    if (requested || checkout) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    queueMicrotask(() => {
      if (requested && FALLBACK_PLANS.some((item) => item.id === requested)) {
        setPlan(requested);
        setConfirmPlan(requested);
      }
      if (checkout && CHECKOUT_NOTICES[checkout]) setCheckoutNotice(checkout);
    });
  }, []);

  const startPlan = () => {
    if (subscribed) {
      setChange({ busy: false, message: null, ok: false });
      setConfirmPlan(plan);
      return;
    }
    void open('upgrade', { plan });
  };

  const changePlan = async () => {
    if (!confirmTarget) return;
    setChange({ busy: true, message: null, ok: false });
    const { envelope } = await api('/sfa/plan/change', { method: 'POST', key: apiKey, body: { plan: confirmTarget.id, confirm: true } });
    setConfirmPlan(null);
    setChange({
      busy: false,
      ok: envelope.ok,
      message: envelope.ok
        ? `You are on ${confirmTarget.name} now. The difference was invoiced and included usage was reset to ${formatUsd(confirmTarget.includedUsd, 2)}.`
        : errorMessage(envelope),
    });
    if (envelope.ok) void refreshWhoami();
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Plan and credit</h1>
      {checkoutNotice ? <Notice tone={CHECKOUT_NOTICES[checkoutNotice].tone}>{CHECKOUT_NOTICES[checkoutNotice].text}</Notice> : null}

      <Card title="Current plan">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className="text-2xl font-semibold">{summary?.planName ?? '...'}</p>
          {summary?.renewsAt ? (
            <p className="text-muted">
              {summary.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {shortDate(summary.renewsAt)}
            </p>
          ) : null}
          {summary?.outrankIncluded ? <p className="rounded-full bg-outrank-soft px-3 py-1 text-sm text-outrank">Included with your Outrank plan</p> : null}
        </div>
        <p className="text-muted">
          {formatUsd(summary?.includedLeftUsd ?? 0, 2)} of included usage left
          {summary?.includedTotalUsd ? ` out of ${formatUsd(summary.includedTotalUsd, 2)}` : ''}, plus {formatUsd(summary?.creditUsd ?? 0, 2)} of one-time credit.
        </p>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-plan`} className="text-sm font-medium">
              {subscribed ? 'Change plan' : 'Start a plan'}
            </label>
            <select id={`${id}-plan`} value={plan} onChange={(event) => setPlan(event.target.value)} className={`${inputClass} sm:w-80`}>
              {FALLBACK_PLANS.map((item) => (
                <option key={item.id} value={item.id} disabled={item.id === summary?.planId}>
                  {item.name}: ${item.priceUsd} a month, ${item.includedUsd.toLocaleString('en-US')} included
                  {item.id === summary?.planId ? ' (current)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className={buttonPrimary} disabled={!!busy || plan === summary?.planId} onClick={startPlan}>
            {busy === 'upgrade' ? <Spinner /> : null}
            {subscribed ? 'Review the change' : 'Continue to Stripe'}
          </button>
          {subscribed || summary?.creditUsd ? (
            <button type="button" className={buttonSecondary} disabled={!!busy} onClick={() => open('manage')}>
              {busy === 'manage' ? <Spinner /> : null}
              Manage billing and invoices
            </button>
          ) : null}
        </div>
        {change.message ? <Notice tone={change.ok ? 'ok' : 'danger'}>{change.message}</Notice> : null}
      </Card>

      <section id="add-credit" className="scroll-mt-24">
        <Card title="Buy credit">
          <p className="text-muted">One payment. Credit is spent after included usage and does not reset.</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Credit amount presets">
            {CREDIT_PRESETS_USD.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={amount === String(preset)}
                onClick={() => setAmount(String(preset))}
                className={`min-h-11 rounded-full border px-4 font-mono text-sm font-semibold ${amount === String(preset) ? 'border-accent bg-accent-soft' : 'border-line bg-white'}`}
              >
                ${preset.toLocaleString('en-US')}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-amount`} className="text-sm font-medium">
                Amount in dollars, ${CREDIT_MIN_USD} to ${CREDIT_MAX_USD.toLocaleString('en-US')}
              </label>
              <input
                id={`${id}-amount`}
                type="number"
                min={CREDIT_MIN_USD}
                max={CREDIT_MAX_USD}
                step={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={!amountValid}
                className={`${inputClass} font-mono sm:w-48`}
              />
            </div>
            <button type="button" className={buttonPrimary} disabled={!!busy || !amountValid} onClick={() => open('top_up', { amount_usd: amountNumber })}>
              {busy === 'top_up' ? <Spinner /> : null}
              Buy ${amountValid ? amountNumber.toLocaleString('en-US') : '...'} of credit
            </button>
          </div>
          {!amountValid ? <p className="text-sm text-danger">Choose a whole amount from ${CREDIT_MIN_USD} to ${CREDIT_MAX_USD.toLocaleString('en-US')}.</p> : null}
        </Card>
      </section>
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Card title="Spend limits">
        <p className="text-muted">Calls over a limit are refused and not charged. Your agent cannot change these.</p>
        {wallet.loading ? (
          <SkeletonRows rows={1} />
        ) : (
          <LimitsForm
            key={`${perCall}-${daily}`}
            perCall={perCall}
            daily={daily}
            onSaved={() => {
              wallet.reload();
              void refreshWhoami();
            }}
          />
        )}
      </Card>

      <Card title="Ledger">
        {wallet.loading ? <SkeletonRows /> : null}
        {!wallet.loading && wallet.envelope && !wallet.envelope.ok ? <ErrorState envelope={wallet.envelope} onRetry={wallet.reload} what="the ledger" /> : null}
        {!wallet.loading && wallet.envelope?.ok && ledger.length === 0 ? <EmptyState title="Payments, included usage grants and charges will show here." /> : null}
        {ledger.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">Last ledger entries</caption>
              <thead>
                <tr className="text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    When
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    What
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">
                    Amount
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Balance after
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row, index) => {
                  const time = relativeTime(pickString(row, ['at', 'created_at']));
                  const amountUsd = pickNumber(row, ['amount_usd']) ?? 0;
                  return (
                    <tr key={`${pickString(row, ['at'])}-${index}`} className="border-t border-line">
                      <td className="py-2 pr-3 whitespace-nowrap text-muted">
                        <time title={time.exact}>{time.label}</time>
                      </td>
                      <td className="py-2 pr-3">{pickString(row, ['description'], pickString(row, ['kind']).replace(/_/g, ' '))}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${amountUsd < 0 ? '' : 'text-ok'}`}>
                        {amountUsd < 0 ? '-' : '+'}
                        {formatUsd(Math.abs(amountUsd))}
                      </td>
                      <td className="py-2 text-right font-mono">{formatUsd(pickNumber(row, ['balance_after_usd']) ?? 0, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      <Modal open={!!confirmTarget} title="Change plan" onClose={() => setConfirmPlan(null)}>
        {confirmTarget ? (
          <div className="flex flex-col gap-4">
            {subscribed ? (
              <>
                <p>
                  Switch to <span className="font-semibold">{confirmTarget.name}</span> for <span className="font-mono font-semibold">${confirmTarget.priceUsd} a month</span>?
                </p>
                <p className="text-sm text-muted">
                  The difference is invoiced to your card now and included usage resets to {formatUsd(confirmTarget.includedUsd, 2)} with {confirmTarget.projects} projects.
                </p>
              </>
            ) : (
              <p>
                Start <span className="font-semibold">{confirmTarget.name}</span> for <span className="font-mono font-semibold">${confirmTarget.priceUsd} a month</span> on Stripe?
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className={buttonSecondary} onClick={() => setConfirmPlan(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={buttonPrimary}
                disabled={change.busy || !!busy}
                onClick={() => (subscribed ? changePlan() : open('upgrade', { plan: confirmTarget.id }))}
              >
                {change.busy || busy ? <Spinner /> : null}
                {subscribed ? `Switch to ${confirmTarget.name}` : 'Continue to Stripe'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
