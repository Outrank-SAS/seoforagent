import { describe, expect, it } from 'vitest';
import { BILLING_POINTS } from '@/lib/docs';
import { BACKLINKS_UNAVAILABLE, buildBuyingPatch, formOf, parseTopics, readBuyingState, readableBlocker, saveFailure, type BuyingForm } from '@/lib/link-buying';
import { FALLBACK_PRICING, creditsToUsd, linkCredits, linkPriceUsd, normalizePricing } from '@/lib/pricing';

const PLANS = [{ id: 'starter', name: 'Starter', price_usd: 9, included_usd: 9 }];

const BUYING = {
  mode: 'seoforagent_credits',
  paused_reason: null,
  credits: 240,
  credits_value_usd: 192,
  usd_per_credit: 0.8,
  min_domain_rating: 40,
  listicles: {
    what: 'Your brand placed as an entry in a "best X" list article on a real site.',
    credits_per_dr_point: 4,
    usd_per_dr_point: 3.2,
    enabled: false,
    monthly_credit_budget: 0,
    spent_this_month: 0,
    cost_at_min_dr_credits: 160,
    topics: ['ai video editors'],
    blockers: ['Set listicles.monthly_credit_budget to at least 160.'],
  },
  backlinks: {
    what: 'A contextual link to your page inside an article on a real site.',
    credits_per_dr_point: 2,
    usd_per_dr_point: 1.6,
    max_links_per_day: 2,
    available: true,
    enabled: true,
    monthly_credit_budget: 160,
    spent_this_month: 80,
    cost_at_min_dr_credits: 80,
    blockers: [],
  },
  target_pages: [{ id: 'tp_1', url: 'https://acme.com/', status: 'active', live_links: 1, in_progress: 0 }],
  enabled: false,
  monthly_credit_budget: 0,
  spent_this_month: 0,
  listicle_topics: ['ai video editors'],
  blockers: ['Set listicles.monthly_credit_budget to at least 160.'],
};

const UNAVAILABLE = {
  ...BUYING,
  mode: 'outrank_backlink_plan',
  backlinks: { ...BUYING.backlinks, available: false, enabled: false, monthly_credit_budget: 0, spent_this_month: 0, blockers: ['This site already receives exchange backlinks through its Outrank plan.'] },
};

const edit = (form: BuyingForm, change: Partial<BuyingForm>): BuyingForm => ({ ...form, ...change });

describe('link prices', () => {
  it('prices a backlink at DR x 2 credits and a listicle at DR x 4', () => {
    expect([linkCredits('backlink', 40), linkPriceUsd('backlink', 40)]).toEqual([80, 64]);
    expect([linkCredits('listicle', 40), linkPriceUsd('listicle', 40)]).toEqual([160, 128]);
    expect([linkPriceUsd('backlink', 30), linkPriceUsd('backlink', 70)]).toEqual([48, 112]);
    expect([linkPriceUsd('listicle', 30), linkPriceUsd('listicle', 70)]).toEqual([96, 224]);
    expect(creditsToUsd(60)).toBe(48);
  });

  it('falls back to 4 and 2 credits per DR point when the API has no products yet', () => {
    const pricing = normalizePricing({ data: { plans: PLANS, backlinks: { usd_per_credit: 0.8, credits_per_dr_point: 4, usd_per_dr_point: 3.2 } } })!;
    expect(pricing.backlinks.products).toEqual({ backlink: { creditsPerDr: 2, maxLinksPerDay: 2 }, listicle: { creditsPerDr: 4, maxLinksPerDay: undefined } });
    expect(pricing.backlinks.creditUsd).toBe(0.8);
    expect(FALLBACK_PRICING.backlinks.products.backlink.creditsPerDr).toBe(2);
    expect(FALLBACK_PRICING.backlinks.products.listicle.creditsPerDr).toBe(4);
  });

  it('reads both products from the API when they are there', () => {
    const pricing = normalizePricing({
      data: {
        plans: PLANS,
        backlinks: {
          usd_per_credit: 0.8,
          credits_per_dr_point: 4,
          products: { listicle: { credits_per_dr_point: 5 }, backlink: { credits_per_dr_point: 3, max_links_per_day: 1 } },
        },
      },
    })!;
    expect(pricing.backlinks.products.listicle.creditsPerDr).toBe(5);
    expect(pricing.backlinks.products.backlink).toEqual({ creditsPerDr: 3, maxLinksPerDay: 1 });
  });

  it('states both DR 40 prices in the docs', () => {
    const text = BILLING_POINTS.join(' ');
    expect(text).toContain('a DR 40 backlink is 80 credits, $64');
    expect(text).toContain('a DR 40 listicle is 160 credits, $128');
    expect(text).toContain('60 credits ($48) or more');
  });
});

describe('link buying state', () => {
  it('reads each product with its own switch, budget, spend and blockers', () => {
    const state = readBuyingState(BUYING);
    expect(state.credits).toBe(240);
    expect(state.creditsValueUsd).toBe(192);
    expect(state.minDr).toBe(40);
    expect(state.products.backlinks).toMatchObject({ available: true, enabled: true, budget: 160, spent: 80, creditsPerDr: 2, maxLinksPerDay: 2, minBudget: 60, blockers: [] });
    expect(state.products.listicles).toMatchObject({ available: true, enabled: false, budget: 0, creditsPerDr: 4, minBudget: 120, topics: ['ai video editors'] });
    expect(state.products.listicles.blockers).toEqual(['Set the listicles monthly budget to at least 160.']);
  });

  it('marks backlinks as unavailable with the reason from the API', () => {
    const state = readBuyingState(UNAVAILABLE);
    expect(state.products.backlinks.available).toBe(false);
    expect(state.products.backlinks.blockers[0]).toBe('This site already receives exchange backlinks through its Outrank plan.');
  });

  it('reads the old single-product shape as listicles and hides backlinks', () => {
    const state = readBuyingState({ credits: 200, min_domain_rating: 50, enabled: true, monthly_credit_budget: 400, spent_this_month: 200, listicle_topics: ['crm'], blockers: [] });
    expect(state.products.listicles).toMatchObject({ enabled: true, budget: 400, spent: 200, topics: ['crm'] });
    expect(state.products.backlinks.available).toBe(false);
    expect(state.products.backlinks.blockers).toEqual([]);
    expect(BACKLINKS_UNAVAILABLE).toMatch(/not available/);
  });

  it('splits topics on commas and new lines without duplicates', () => {
    expect(parseTopics(' ai video editors, crm\ncrm ,\n\n tools for youtubers ')).toEqual(['ai video editors', 'crm', 'tools for youtubers']);
  });

  it('rewrites API field names in a blocker', () => {
    expect(readableBlocker('Set backlinks.monthly_credit_budget to at least 80.')).toBe('Set the backlinks monthly budget to at least 80.');
  });
});

describe('link buying save', () => {
  const state = readBuyingState(BUYING);
  const form = formOf(state);

  it('sends nothing when nothing changed', () => {
    expect(buildBuyingPatch(state, form)).toEqual({ body: {} });
  });

  it('sends only the nested shape, and only what changed', () => {
    const next = edit(form, {
      minDr: '50',
      products: { backlinks: { enabled: false, budget: '200' }, listicles: { enabled: true, budget: '400' } },
      topics: 'ai video editors, crm',
    });
    const { body } = buildBuyingPatch(state, next);
    expect(body).toEqual({
      min_domain_rating: 50,
      backlinks: { enabled: false, monthly_credit_budget: 200 },
      listicles: { enabled: true, monthly_credit_budget: 400, topics: ['ai video editors', 'crm'] },
    });
    expect(Object.keys(body!)).not.toEqual(expect.arrayContaining(['enabled', 'monthly_credit_budget', 'listicle_topics', 'prefer_listicle']));
    expect(buildBuyingPatch(state, edit(form, { products: { ...form.products, backlinks: { enabled: true, budget: '240' } } })).body).toEqual({ backlinks: { monthly_credit_budget: 240 } });
  });

  it('enforces each minimum budget, the DR range and 10 topics', () => {
    expect(buildBuyingPatch(state, edit(form, { products: { ...form.products, backlinks: { enabled: true, budget: '59' } } })).error).toMatch(/backlinks monthly budget must be from 60 to 20,000/);
    expect(buildBuyingPatch(state, edit(form, { products: { ...form.products, backlinks: { enabled: true, budget: '60' } } })).body).toEqual({ backlinks: { monthly_credit_budget: 60 } });
    expect(buildBuyingPatch(state, edit(form, { products: { ...form.products, listicles: { enabled: false, budget: '119' } } })).error).toMatch(/listicles monthly budget must be from 120/);
    expect(buildBuyingPatch(state, edit(form, { minDr: '29' })).error).toMatch(/30 to 70/);
    expect(buildBuyingPatch(state, edit(form, { topics: Array.from({ length: 11 }, (_, index) => `topic ${index}`).join(', ') })).error).toMatch(/10 or fewer/);
  });

  it('never sends backlinks for a site that cannot buy them', () => {
    const blocked = readBuyingState(UNAVAILABLE);
    const next = edit(formOf(blocked), { products: { backlinks: { enabled: true, budget: '200' }, listicles: { enabled: true, budget: '160' } } });
    expect(buildBuyingPatch(blocked, next).body).toEqual({ listicles: { enabled: true, monthly_credit_budget: 160 } });
  });

  it('shows the blockers of a 409 once', () => {
    const blockers = ['Add at least 80 more credits: a DR 40 backlink costs 80 credits.', 'Set backlinks.monthly_credit_budget to at least 80.'];
    const failure = saveFailure({ ok: false, error: { code: 'CONFLICT', message: `Backlinks cannot start yet: ${blockers.join(' ')}`, details: { blockers } } }, 'Try again.');
    expect(failure.message).toBe('Backlinks cannot start yet:');
    expect(failure.blockers).toEqual(['Add at least 80 more credits: a DR 40 backlink costs 80 credits.', 'Set the backlinks monthly budget to at least 80.']);
    expect(saveFailure({ ok: false, error: { message: 'min_domain_rating must be between 30 and 70.' } }, 'Try again.')).toEqual({ message: 'min_domain_rating must be between 30 and 70.', blockers: [] });
    expect(saveFailure({ ok: false }, 'Try again.')).toEqual({ message: 'Try again.', blockers: [] });
  });
});
