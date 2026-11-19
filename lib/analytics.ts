export type TrackProps = Record<string, string | number | boolean | null | undefined>;

interface PostHogLike {
  capture?: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogLike;
    Rewardful?: { referral?: string };
    rewardful?: (...args: unknown[]) => void;
  }
}

export const ANALYTICS_SURFACE = 'sfa';

const KEY_SHAPE = /sfa_live_[A-Za-z0-9_-]+/;
const EMAIL_SHAPE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const BLOCKED_NAMES = ['key', 'api_key', 'apikey', 'email', 'token'];

export const safeProps = (props: TrackProps = {}): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (BLOCKED_NAMES.includes(name.toLowerCase())) continue;
    if (typeof value === 'string' && (KEY_SHAPE.test(value) || EMAIL_SHAPE.test(value))) continue;
    out[name] = value;
  }
  out.surface = ANALYTICS_SURFACE;
  return out;
};

export const track = (event: string, props: TrackProps = {}): void => {
  if (typeof window === 'undefined') return;
  try {
    window.posthog?.capture?.(event, safeProps(props));
  } catch {
    return;
  }
};
