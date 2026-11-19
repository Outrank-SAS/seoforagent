import type { Envelope } from './api';
import { pick, pickBool, pickNumber, pickString } from './pick';
import { BACKLINK_CREDIT_USD, BACKLINK_MAX_DR, BACKLINK_MIN_DR, LINK_EXAMPLE_DR, LINK_MAX_CREDITS, LINK_PRODUCTS, type LinkProductId } from './pricing';

export type BuyingKey = 'backlinks' | 'listicles';

export const BUYING_PRODUCTS: { key: BuyingKey; id: LinkProductId }[] = [
  { key: 'backlinks', id: 'backlink' },
  { key: 'listicles', id: 'listicle' },
];

export const MAX_TOPICS = 10;
export const BACKLINKS_UNAVAILABLE = 'Backlinks are not available for this site yet.';

export interface ProductState {
  key: BuyingKey;
  id: LinkProductId;
  name: string;
  role: string;
  what: string;
  creditsPerDr: number;
  maxLinksPerDay: number | undefined;
  minBudget: number;
  available: boolean;
  enabled: boolean;
  budget: number;
  spent: number;
  blockers: string[];
  topics: string[];
}

export interface BuyingState {
  credits: number;
  creditsValueUsd: number;
  creditUsd: number;
  minDr: number;
  pausedReason: string;
  products: Record<BuyingKey, ProductState>;
}

export interface BuyingForm {
  minDr: string;
  products: Record<BuyingKey, { enabled: boolean; budget: string }>;
  topics: string;
}

export const readableBlocker = (text: string): string => text.replace(/\b(listicles|backlinks)\.monthly_credit_budget\b/g, 'the $1 monthly budget');

const textsOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [])
    .map((item) => (typeof item === 'string' ? item : pickString(item, ['message', 'reason'])))
    .filter((item) => item.trim().length > 0);

const stringsOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []);

const productOf = (data: unknown, key: BuyingKey, id: LinkProductId): ProductState => {
  const row = pick(data, [key]);
  const legacy = key === 'listicles';
  const paths = (name: string, legacyName = name): string[] => (legacy ? [`${key}.${name}`, legacyName] : [`${key}.${name}`]);
  const base = LINK_PRODUCTS[id];
  return {
    key,
    id,
    name: base.name,
    role: base.role,
    what: pickString(row, ['what'], base.what),
    creditsPerDr: pickNumber(row, ['credits_per_dr_point']) ?? base.creditsPerDr,
    maxLinksPerDay: pickNumber(row, ['max_links_per_day']) ?? base.maxLinksPerDay,
    minBudget: base.minBudgetCredits,
    available: key === 'listicles' ? true : row ? (pickBool(row, ['available']) ?? true) : false,
    enabled: pickBool(data, paths('enabled')) ?? false,
    budget: pickNumber(data, paths('monthly_credit_budget')) ?? 0,
    spent: pickNumber(data, paths('spent_this_month')) ?? 0,
    blockers: textsOf(pick(data, paths('blockers'))).map(readableBlocker),
    topics: stringsOf(pick(data, paths('topics', 'listicle_topics'))),
  };
};

export const readBuyingState = (data: unknown): BuyingState => {
  const credits = pickNumber(data, ['credits']) ?? 0;
  const creditUsd = pickNumber(data, ['usd_per_credit', 'pricing.usd_per_credit']) ?? BACKLINK_CREDIT_USD;
  return {
    credits,
    creditsValueUsd: pickNumber(data, ['credits_value_usd']) ?? Math.round(credits * creditUsd * 100) / 100,
    creditUsd,
    minDr: pickNumber(data, ['min_domain_rating']) ?? LINK_EXAMPLE_DR,
    pausedReason: pickString(data, ['paused_reason']),
    products: {
      backlinks: productOf(data, 'backlinks', 'backlink'),
      listicles: productOf(data, 'listicles', 'listicle'),
    },
  };
};

export const parseTopics = (text: string): string[] => [
  ...new Set(
    text
      .split(/[\n,]+/)
      .map((topic) => topic.trim())
      .filter(Boolean),
  ),
];

export const formOf = (state: BuyingState): BuyingForm => ({
  minDr: String(state.minDr),
  products: {
    backlinks: { enabled: state.products.backlinks.enabled, budget: state.products.backlinks.budget ? String(state.products.backlinks.budget) : '' },
    listicles: { enabled: state.products.listicles.enabled, budget: state.products.listicles.budget ? String(state.products.listicles.budget) : '' },
  },
  topics: state.products.listicles.topics.join(', '),
});

export const validDr = (value: string, fallback: number): number => {
  const dr = Number(value);
  return Number.isInteger(dr) && dr >= BACKLINK_MIN_DR && dr <= BACKLINK_MAX_DR ? dr : fallback;
};

export type BuyingPatch = { body: Record<string, unknown>; error?: undefined } | { body?: undefined; error: string };

export const buildBuyingPatch = (state: BuyingState, form: BuyingForm): BuyingPatch => {
  const body: Record<string, unknown> = {};
  const dr = Number(form.minDr);
  if (dr !== state.minDr) {
    if (!Number.isInteger(dr) || dr < BACKLINK_MIN_DR || dr > BACKLINK_MAX_DR) return { error: `Minimum DR must be from ${BACKLINK_MIN_DR} to ${BACKLINK_MAX_DR}.` };
    body.min_domain_rating = dr;
  }
  for (const { key } of BUYING_PRODUCTS) {
    const product = state.products[key];
    if (!product.available) continue;
    const patch: Record<string, unknown> = {};
    const budget = Number(form.products[key].budget || 0);
    if (budget !== product.budget) {
      if (!Number.isInteger(budget) || budget < product.minBudget || budget > LINK_MAX_CREDITS) {
        return { error: `The ${product.name.toLowerCase()} monthly budget must be from ${product.minBudget} to ${LINK_MAX_CREDITS.toLocaleString('en-US')} credits.` };
      }
      patch.monthly_credit_budget = budget;
    }
    if (form.products[key].enabled !== product.enabled) patch.enabled = form.products[key].enabled;
    if (key === 'listicles') {
      const topics = parseTopics(form.topics);
      if (topics.join('\n') !== product.topics.join('\n')) {
        if (topics.length > MAX_TOPICS) return { error: `Keep the listicle topics to ${MAX_TOPICS} or fewer.` };
        patch.topics = topics;
      }
    }
    if (Object.keys(patch).length > 0) body[key] = patch;
  }
  return { body };
};

export const saveFailure = (envelope: Envelope, fallback: string): { message: string; blockers: string[] } => {
  const blockers = stringsOf(envelope.error?.details?.blockers);
  let message = envelope.error?.message || fallback;
  for (const blocker of blockers) message = message.replace(blocker, '');
  message = message.replace(/\s+/g, ' ').trim();
  return { message: message || fallback, blockers: blockers.map(readableBlocker) };
};
