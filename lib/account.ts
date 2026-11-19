import { pickArray, pickBool, pickNumber, pickString } from './pick';
import { FALLBACK_PLANS } from './pricing';

export interface AccountSummary {
  active: boolean;
  planId: string;
  planName: string;
  outrankIncluded: boolean;
  includedLeftUsd: number | undefined;
  includedTotalUsd: number | undefined;
  creditUsd: number | undefined;
  renewsAt: string;
  cancelAtPeriodEnd: boolean;
  email: string;
  projectsCount: number;
  projectLimit: number | undefined;
  agentConnected: boolean;
  hasProject: boolean;
  perCallLimitUsd: number | undefined;
  dailyLimitUsd: number | undefined;
}

const PLAN_LABELS: Record<string, string> = {
  credit: 'Credit only',
  outrank_included: 'Included with Outrank',
  none: 'No plan',
};

export const summarizeAccount = (data: unknown): AccountSummary => {
  const planId = pickString(data, ['access.plan', 'plan.id', 'plan']);
  const fallback = FALLBACK_PLANS.find((plan) => plan.id === planId);
  const label = pickString(data, ['access.plan_label']);
  const projects = pickArray(data, ['projects']);
  const callsMade = pickNumber(data, ['setup.calls_made']) ?? 0;
  return {
    active: pickBool(data, ['access.active']) ?? true,
    planId,
    planName: fallback?.name ?? (label ? label.replace(/ plan$/, '') : PLAN_LABELS[planId] ?? 'No plan'),
    outrankIncluded: planId === 'outrank_included' || (pickBool(data, ['access.outrank_customer']) ?? false),
    includedLeftUsd: pickNumber(data, ['balance.included_left_usd', 'included_left_usd']),
    includedTotalUsd: pickNumber(data, ['balance.included_per_period_usd', 'included_per_period_usd']) ?? fallback?.includedUsd,
    creditUsd: pickNumber(data, ['balance.credit_usd', 'credit_usd']),
    renewsAt: pickString(data, ['access.renews_at', 'included_resets_at']),
    cancelAtPeriodEnd: pickBool(data, ['access.cancel_at_period_end']) ?? false,
    email: pickString(data, ['account.email']),
    projectsCount: projects.length,
    projectLimit: pickNumber(data, ['access.project_limit']),
    agentConnected: callsMade > 0,
    hasProject: pickBool(data, ['setup.has_project']) ?? projects.length > 0,
    perCallLimitUsd: pickNumber(data, ['balance.per_call_limit_usd']),
    dailyLimitUsd: pickNumber(data, ['balance.daily_limit_usd']),
  };
};

export const lowIncluded = (summary: AccountSummary): boolean =>
  summary.active &&
  summary.includedLeftUsd !== undefined &&
  summary.includedTotalUsd !== undefined &&
  summary.includedTotalUsd > 0 &&
  summary.includedLeftUsd / summary.includedTotalUsd < 0.2;

export const nextPlan = (planId: string) => {
  const index = FALLBACK_PLANS.findIndex((plan) => plan.id === planId);
  if (index === -1) return FALLBACK_PLANS[0];
  return FALLBACK_PLANS[index + 1] ?? null;
};

export const hasSubscription = (summary: AccountSummary | null): boolean => !!summary && FALLBACK_PLANS.some((plan) => plan.id === summary.planId);
