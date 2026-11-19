'use client';

import { useId } from 'react';
import type { Plan } from '@/lib/pricing';
import { inputClass } from '@/lib/styles';

export type Purchase = { kind: 'plan'; plan: string } | { kind: 'credit'; amountUsd: number };

export interface PlanPickerProps {
  plans: Plan[];
  presetsUsd: number[];
  minUsd: number;
  maxUsd: number;
  kind: 'plan' | 'credit';
  plan: string;
  amount: string;
  onKind: (kind: 'plan' | 'credit') => void;
  onPlan: (plan: string) => void;
  onAmount: (amount: string) => void;
}

const money = (value: number): string => `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export const creditAmountError = (amount: string, minUsd: number, maxUsd: number): string | null => {
  const value = Number(amount);
  if (!amount.trim() || !Number.isFinite(value)) return `Enter an amount from ${money(minUsd)} to ${money(maxUsd)}.`;
  if (!Number.isInteger(value)) return 'Use whole dollars.';
  if (value < minUsd || value > maxUsd) return `Choose from ${money(minUsd)} to ${money(maxUsd)}.`;
  return null;
};

export const PlanPicker = ({ plans, presetsUsd, minUsd, maxUsd, kind, plan, amount, onKind, onPlan, onAmount }: PlanPickerProps) => {
  const id = useId();
  const custom = !presetsUsd.map(String).includes(amount);
  const amountError = kind === 'credit' ? creditAmountError(amount, minUsd, maxUsd) : null;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="How to pay" className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1 sm:max-w-xs">
        {(['plan', 'credit'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={kind === value}
            onClick={() => onKind(value)}
            className={`min-h-9 rounded-lg text-sm font-medium transition-colors ${kind === value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            {value === 'plan' ? 'Monthly plan' : 'Buy credit once'}
          </button>
        ))}
      </div>

      {kind === 'plan' ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Plan</legend>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {plans.map((item) => {
              const checked = item.id === plan;
              return (
                <label
                  key={item.id}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${checked ? 'bg-accent-soft/70' : 'hover:bg-surface/70'}`}
                >
                  <input
                    type="radio"
                    name={`${id}-plan`}
                    value={item.id}
                    checked={checked}
                    onChange={() => onPlan(item.id)}
                    className="h-4 w-4 shrink-0 accent-[#c2410c]"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="w-20 shrink-0 font-semibold">{item.name}</span>
                    <span className="text-sm text-muted">
                      {money(item.includedUsd)} of usage a month · {item.projects} {item.projects === 1 ? 'website' : 'websites'}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-semibold">
                    {money(item.priceUsd)}
                    <span className="font-sans font-normal text-muted">/mo</span>
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted">Included usage resets at each renewal. Cancel any time from the dashboard.</p>
        </fieldset>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="sr-only">Credit amount</legend>
          <div className="flex flex-wrap gap-2">
            {presetsUsd.map((preset) => {
              const checked = amount === String(preset);
              return (
                <label
                  key={preset}
                  className={`inline-flex min-h-10 cursor-pointer items-center rounded-lg border px-4 font-mono text-sm font-semibold transition-colors ${
                    checked ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-white hover:border-ink/40'
                  }`}
                >
                  <input type="radio" name={`${id}-amount`} value={preset} checked={checked} onChange={() => onAmount(String(preset))} className="sr-only" />
                  {money(preset)}
                </label>
              );
            })}
          </div>
          <div className="flex flex-col gap-1 sm:max-w-xs">
            <label htmlFor={`${id}-custom`} className="text-sm font-medium">
              Or another amount, {money(minUsd)} to {money(maxUsd)}
            </label>
            <div className="relative">
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-muted">
                $
              </span>
              <input
                id={`${id}-custom`}
                type="number"
                inputMode="numeric"
                min={minUsd}
                max={maxUsd}
                step={1}
                value={custom ? amount : ''}
                placeholder="250"
                onChange={(event) => onAmount(event.target.value)}
                aria-invalid={custom && !!amountError}
                aria-describedby={`${id}-amount-help`}
                className={`${inputClass} pl-7 font-mono`}
              />
            </div>
            <p id={`${id}-amount-help`} className={`text-sm ${amountError && custom && amount ? 'text-danger' : 'text-muted'}`}>
              {amountError && custom && amount ? amountError : 'One payment. Credit does not reset and is spent after any included usage.'}
            </p>
          </div>
        </fieldset>
      )}
    </div>
  );
};
