import { OUTRANK_API_BASE } from './config';
import { TOOLS } from './tools';

export interface Plan {
  id: string;
  name: string;
  priceUsd: number;
  includedUsd: number;
  projects: number;
  schedules: boolean;
  whiteLabel: boolean;
  tagline: string;
}

export interface ToolPrice {
  tool: string;
  unit: string;
  description: string;
}

export interface Pricing {
  source: 'live' | 'fallback';
  plans: Plan[];
  credit: { minUsd: number; maxUsd: number; presetsUsd: number[] };
  tools: ToolPrice[];
  backlinks: { creditUsd: number; creditsPerDr: number; minDr: number; maxDr: number };
  outrankIncluded: { includedUsd: number; projects: number };
}

export const FALLBACK_PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', priceUsd: 9, includedUsd: 9, projects: 1, schedules: false, whiteLabel: false, tagline: 'For one website' },
  { id: 'growth', name: 'Growth', priceUsd: 49, includedUsd: 55, projects: 5, schedules: true, whiteLabel: false, tagline: 'For founders and freelancers' },
  { id: 'pro', name: 'Pro', priceUsd: 99, includedUsd: 115, projects: 15, schedules: true, whiteLabel: false, tagline: 'For growing teams' },
  { id: 'business', name: 'Business', priceUsd: 299, includedUsd: 360, projects: 50, schedules: true, whiteLabel: true, tagline: 'For agencies and heavy link buyers' },
  { id: 'agency', name: 'Agency', priceUsd: 899, includedUsd: 1100, projects: 200, schedules: true, whiteLabel: true, tagline: 'For agencies running many clients' },
];

export const CREDIT_PRESETS_USD = [25, 100, 500, 2000];
export const CREDIT_MIN_USD = 10;
export const CREDIT_MAX_USD = 5000;
export const BACKLINK_CREDIT_USD = 0.8;
export const BACKLINK_CREDITS_PER_DR = 4;

export const linkPriceUsd = (dr: number): number => Math.round(dr * BACKLINK_CREDITS_PER_DR * BACKLINK_CREDIT_USD * 100) / 100;

export const FALLBACK_TOOL_PRICES: ToolPrice[] = TOOLS.filter((tool) => tool.kind === 'paid').map((tool) => ({
  tool: tool.name,
  unit: tool.price,
  description: tool.title,
}));

export const FALLBACK_PRICING: Pricing = {
  source: 'fallback',
  plans: FALLBACK_PLANS,
  credit: { minUsd: CREDIT_MIN_USD, maxUsd: CREDIT_MAX_USD, presetsUsd: CREDIT_PRESETS_USD },
  tools: FALLBACK_TOOL_PRICES,
  backlinks: { creditUsd: BACKLINK_CREDIT_USD, creditsPerDr: BACKLINK_CREDITS_PER_DR, minDr: 30, maxDr: 70 },
  outrankIncluded: { includedUsd: 10, projects: 50 },
};

type Loose = Record<string, unknown>;

const num = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const parsed = typeof value === 'string' ? Number(value) : value;
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const usdOf = (row: Loose, usdKey: string, centsKey: string, microKey?: string): number | undefined => {
  const usd = num(row[usdKey]);
  if (usd !== undefined) return usd;
  const cents = num(row[centsKey]);
  if (cents !== undefined) return cents / 100;
  const micro = microKey ? num(row[microKey]) : undefined;
  return micro !== undefined ? micro / 1_000_000 : undefined;
};

const formatPrice = (usd: number): string => {
  if (usd >= 0.1) return `$${usd.toFixed(2)}`;
  return `$${Number(usd.toFixed(3))}`;
};

export const normalizePricing = (payload: unknown): Pricing | null => {
  const root = (payload && typeof payload === 'object' ? payload : {}) as Loose;
  const data = (root.data && typeof root.data === 'object' ? root.data : root) as Loose;
  if (!Array.isArray(data.plans) || data.plans.length === 0) return null;
  const plans: Plan[] = [];
  for (const raw of data.plans as Loose[]) {
    const fallback = FALLBACK_PLANS.find((plan) => plan.id === raw.id);
    const priceUsd = usdOf(raw, 'price_usd', 'price_cents') ?? fallback?.priceUsd;
    const includedUsd = usdOf(raw, 'included_usd', 'included_cents', 'included_microusd') ?? fallback?.includedUsd;
    if (typeof raw.id !== 'string' || priceUsd === undefined || includedUsd === undefined) continue;
    plans.push({
      id: raw.id,
      name: typeof raw.name === 'string' ? raw.name : fallback?.name ?? raw.id,
      priceUsd,
      includedUsd,
      projects: num(raw.project_limit, raw.projects) ?? fallback?.projects ?? 1,
      schedules: typeof raw.schedules === 'boolean' ? raw.schedules : fallback?.schedules ?? false,
      whiteLabel: typeof raw.white_label === 'boolean' ? raw.white_label : fallback?.whiteLabel ?? false,
      tagline: typeof raw.tagline === 'string' ? raw.tagline : fallback?.tagline ?? '',
    });
  }
  if (plans.length === 0) return null;
  const creditSource = data.credit ?? data.topups;
  const topups = (creditSource && typeof creditSource === 'object' ? creditSource : {}) as Loose;
  const presets = Array.isArray(topups.presets_usd)
    ? (topups.presets_usd as unknown[]).map((value) => num(value)).filter((value): value is number => value !== undefined)
    : Array.isArray(topups.presets_cents)
      ? (topups.presets_cents as unknown[]).map((value) => (num(value) ?? 0) / 100).filter((value) => value > 0)
      : CREDIT_PRESETS_USD;
  const tools: ToolPrice[] = Array.isArray(data.tools)
    ? (data.tools as Loose[])
        .filter((row) => typeof row.tool === 'string')
        .map((row) => {
          const example = num(row.example_max_usd) ?? usdOf(row, 'example_usd', 'example_cents', 'example_microusd');
          const unit = typeof row.unit === 'string' ? row.unit : '';
          const prefix = row.pricing === 'fixed' ? '' : 'Up to ';
          return {
            tool: row.tool as string,
            unit: example !== undefined ? `${prefix}${formatPrice(example)} ${unit}`.trim() : unit,
            description: typeof row.description === 'string' ? row.description : '',
          };
        })
    : FALLBACK_TOOL_PRICES;
  const backlinks = (data.backlinks && typeof data.backlinks === 'object' ? data.backlinks : {}) as Loose;
  const included = (data.outrank_included && typeof data.outrank_included === 'object' ? data.outrank_included : {}) as Loose;
  return {
    source: 'live',
    plans,
    credit: {
      minUsd: usdOf(topups, 'min_usd', 'min_cents') ?? CREDIT_MIN_USD,
      maxUsd: usdOf(topups, 'max_usd', 'max_cents') ?? CREDIT_MAX_USD,
      presetsUsd: presets.length > 0 ? presets : CREDIT_PRESETS_USD,
    },
    tools: tools.length > 0 ? tools : FALLBACK_TOOL_PRICES,
    backlinks: {
      creditUsd: num(backlinks.usd_per_credit) ?? usdOf(backlinks, 'credit_usd', 'credit_cents', 'credit_microusd') ?? BACKLINK_CREDIT_USD,
      creditsPerDr: num(backlinks.credits_per_dr_point, backlinks.credits_per_dr) ?? BACKLINK_CREDITS_PER_DR,
      minDr: num(backlinks.min_dr) ?? 30,
      maxDr: num(backlinks.max_dr) ?? 70,
    },
    outrankIncluded: {
      includedUsd: usdOf(included, 'included_usd', 'included_cents', 'included_microusd') ?? 10,
      projects: num(included.project_limit, included.projects) ?? 50,
    },
  };
};

export const fetchPricing = async (): Promise<Pricing> => {
  try {
    const response = await fetch(`${OUTRANK_API_BASE}/sfa/pricing`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return FALLBACK_PRICING;
    return normalizePricing(await response.json()) ?? FALLBACK_PRICING;
  } catch {
    return FALLBACK_PRICING;
  }
};
